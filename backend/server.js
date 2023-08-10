const express = require("express");
const app = express();
const cors = require('cors');
const bcrypt = require("bcrypt")
const axios = require('axios')
const session = require('express-session');
const dotenv = require("dotenv")
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
dotenv.config();
require('express-async-errors');
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
app.enable('trust proxy');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripe = require("stripe")(stripeSecretKey);
var coinbase = require('coinbase-commerce-node');
var Client = coinbase.Client;
var resources = coinbase.resources;
Client.init(process.env.COINBASE_API);

//Connect to Mongo
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_STRING, { useNewUrlParser: true });
        console.log(`Connected to DB`);
    } catch (error) {
        console.log("Couldn't connect to DB: ", error);
        process.exit(1);
    }
}

//Import schema modules
const User = require('./model/users.js');
const tempTokens = require('./model/tempToken.js');
const tempOTPS = require('./model/tempOTPs.js');

const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
    uri: process.env.DB_STRING,
    collection: 'sessions',
});

//Start app
app.use('/', express.static(__dirname + '/public'));
function customJsonParser(req, res, next) {
    if (req.path === '/webhook' && req.method === 'POST') {
        // If the request is for "/webhook" and it's a POST request, skip the JSON parsing
        next();
    } else {
        // For all other requests, use express.json()
        express.json()(req, res, next);
    }
}
app.use(customJsonParser);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000/");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
const whitelist = 'http://localhost:3000'
app.use(cors({
    origin: whitelist,
    methods: ['POST', 'GET', 'PATCH', 'OPTIONS'],
    credentials: true
}));
app.use(session({
    name: 'sessionID',
    secret: 'strongass',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 600000,
        httpOnly: true,
        // secure: true,
        // sameSite: 'none',
    },
    store: store,
}));

//Set up transporter for nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

//STRIPE API

app.get("/getStripePublicKey", (req, res) => {
    const key = stripePublicKey;
    res.json(key);
})

const calculateOrderAmount = (amount) => {
    const totalVal = amount * 100;
    return Number(totalVal);
};

app.post("/create-payment-intent", async (req, res) => {
    try {
        const { amount } = req.body;
        const { email } = req.body;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: calculateOrderAmount(amount),
            currency: "usd",
            automatic_payment_methods: {
                enabled: false,
            },
            metadata: {
                email: email,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err) {
        console.log(err);
        res.send({ err });
    }
});

//Stripe API Webhook implementation
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/webhook', express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log("Failed to verify webook.");
        return;
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        // console.log("Payment succeeded!", paymentIntent);
        let user = await User.findOne({ email: paymentIntent.metadata.email })
        if (!user)
            throw new Error('Does not exist.');
        let userExistingCredits = user.credits;
        User.updateOne({
            "_id": user._id.toString()
        }, {
            // set amount
            "credits": Number(userExistingCredits) + Number(paymentIntent.amount)
        })
            .then((obj) => {
                console.log("User credits updated");
            })
            .catch((err) => {
                console.log(err);
            })
    }
    res.end();
});

//COINBASE API
app.post("/payWithCrypto", async (req, res) => {
    const { amount } = req.body;

    try {
        const charge = await resources.Charge.create({
            name: "Test Charge",
            description: "Test Charge Description",
            local_price: {
                amount: amount,
                currency: "USD"
            },
            pricing_type: "fixed_price",
            metadata: {
                email: "test@gmail.com"
            }
        })
        res.json({ redirect: charge.hosted_url });
    } catch (err) {
        console.log(err);
    }
})

//Error handler function
async function handleErr(err, req, res, next) {
    console.log(err.message)
    return res.json({ errMsg: err.message })
}

//Signing in
app.post('/signin', async (req, res) => {
    const { email, password } = req.body

    const data = {
        email: email,
        password: password
    }
    var emailAddress = data.email.toLowerCase();
    try {
        let user = await User.findOne({ email: emailAddress })
        if (!user)
            throw new Error('Incorrect email or password.');
        const comparePass = await bcrypt.compare(password, user.password);
        if (!comparePass) {
            throw new Error('Incorrect email or password.');
        } else {
            req.session.user = user;
            req.session.isLoggedIn = true;
            const userInfo = {
                credits: user.credits,
                userName: user.userName,
                joinedDate: user.createdAt,
            }
            res.json({ redirect: '/', userInfo });
        }
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

//Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    return res.json({ redirect: '/' })
})

//Signing up
app.post("/signup", async (req, res) => {
    try {
        const { userName, email, password } = req.body

        const data = {
            userName: userName,
            email: email,
            password: password
        }

        const userNameExists = await User.findOne({ userName: data.userName })
        if (userNameExists) throw new Error('This username is already associated with an account.');
        const emailExists = await User.findOne({ email: data.email })
        if (emailExists) throw new Error('This email is already associated with an account.');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        const new_user = new User({
            userName: data.userName,
            email: data.email,
            password: hashedPassword,
        });
        new_user.save()

        const token = crypto.randomBytes(32).toString("hex");
        const create_token = new tempTokens({
            token: token,
            userid: new_user._id
        })
        create_token.save()
        const url = `http://localhost:3000/users/${new_user._id}/verify/${token}`;
        await sendSignUpConfirmationEmail(data.email, url);

        req.session.user = new_user;
        req.session.isLoggedIn = true;
        res.json({ redirect: '/verifyemail' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

//Email verification
app.get("/generateToken", async (req, res) => {
    const findToken = await tempTokens.findOne({ userid: req.session.user._id.toString() });
    if (findToken) {
        tempTokens.deleteOne({
            _id: findToken._id.toString()
        })
            .then(function () {
                console.log('successfuly deleted');
            }).catch(function (error) {
                console.log(error); // Failure
            });
    }
    generateTokenHelper(req.session.user._id, req.session.user.email);
})

async function generateTokenHelper(userID, email) {
    const token = crypto.randomBytes(32).toString("hex");
    const create_token = new tempTokens({
        token: token,
        userid: userID
    })
    create_token.save()
    const url = `http://localhost:3000/users/${userID}/verify/${token}`;
    console.log(url);
    sendSignUpConfirmationEmail(email, url);
}

async function sendSignUpConfirmationEmail(emailAddress, url) {
    const signUpConfirmationEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'Confirmation your email - KEMLabels',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -8) + '/frontend/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <p>Thank you for signing up with us!</p>
        <p>Please use the following link to confirm your email address: <a href="${url}" target="_blank">${url}</a></p>
        <p>If you did not sign up for KEMLabels, you can safely ignore this email.</p>
        <p>Have any questions? Please contact us at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team!</p>
        </div>`,
    }
    transporter.sendMail(signUpConfirmationEmail, function (err, info) {
        if (err) console.log(err)
    });
}

app.get('/users/:id/verify/:token', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });
        if (!user) throw new Error('Link Invalid');
        const token = await tempTokens.findOne({ token: req.params.token });
        if (!token) {
            const previoustoken = await tempTokens.findOne({ userid: req.params.id })
            if (previoustoken) {
                if (previoustoken.token !== req.params.token) throw new Error('Link Expired');
            } else throw new Error('Link Invalid');
        }

        User.updateOne({
            "_id": user._id.toString()
        }, {
            "verified": true
        })
            .then((obj) => {
                console.log("User has been verified");
            })
            .catch((err) => {
                console.log(err);
            })

        tempTokens.deleteOne({
            token: req.params.token
        })
            .then(function () {
                console.log('successfuly deleted');
            }).catch(function (error) {
                console.log(error); // Failure
            });

        return res.json({ redirect: '/' });
    } catch (err) {
        console.log(err);
        if (err.message === 'Link Invalid' || err.message === 'Link Expired') {
            return res.status(400).json({ msg: err.message });
        }
        return res.status(400).json({ msg: err.message });
    }
})

app.get('/isUserVerified', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.session.user._id });
        if (!user) throw new Error('An error occured.');
        const verified = user.verified;

        if (!verified) throw new Error('Please check your inbox for a verification link to verify your account.');
        else res.json({ redirect: '/' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }

})

app.get('/checkVerification', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.session.user._id });
        if (!user) throw new Error('An error occured.');
        const verified = user.verified;
        if (!verified) throw new Error('User is not verified');
        res.json({ redirect: '/' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

//Forgot password
app.post("/emailExists", async (req, res) => {
    try {
        const { email } = req.body

        const data = {
            email: email
        }

        const emailExists = await User.findOne({ email: data.email })
        if (!emailExists) throw new Error('This email is not associated with an account.');
        else res.json({ emailExists });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

app.post("/forgotpassword", async (req, res) => {
    const { email } = req.body
    const otp = Math.floor(1000 + Math.random() * 9000);

    const create_OTP = new tempOTPS({
        passcode: otp,
        email: email
    })
    create_OTP.save()
    sendOTPEmail(otp, email);
})

app.post("/generateNewOTP", async (req, res) => {
    const { email } = req.body
    const findOTP = await tempOTPS.findOne({ email: email });
    if (findOTP) {
        console.log(findOTP)
        tempOTPS.deleteOne({
            _id: findOTP._id.toString()
        })
            .then(function () {
                generateOTPHelper(email);
                console.log('successfuly deleted');
            }).catch(function (error) {
                console.log(error); // Failure
            });
    } else {
        generateOTPHelper(email);
    }
})

async function generateOTPHelper(email) {
    const otp = Math.floor(1000 + Math.random() * 9000);
    const create_OTP = new tempOTPS({
        passcode: otp,
        email: email
    })
    create_OTP.save()
    sendOTPEmail(otp, email);
}

// TODO: ADD USERNAME
function sendOTPEmail(OTPPasscode, emailAddress) {
    const sendOneTimePasscodeEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels Verification Code',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -8) + '/frontend/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <p>You have requested to reset the password for your account with the username, <strong>USERNAME</strong>.</p>
        <p>To confirm your email address, please enter the 4 digit code below.</p>
        <div style="margin: 2rem; text-align: center;"><h1 style="font-size: ;letter-spacing: 5px">${OTPPasscode}</h1></div>
        <p>If you did not initiate this request, you can safely ignore this email or let us know.</p>
        <p>Have any questions? Please contact us at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team!</p>
        </div>`,
    }
    transporter.sendMail(sendOneTimePasscodeEmail, function (err, info) {
        if (err) console.log(err)
    });
}

app.post("/checkOTP", async (req, res) => {
    try {
        const { enteredOTP } = req.body
        const { email } = req.body
        console.log('entered code: ' + enteredOTP);
        const tempCode = await tempOTPS.findOne({ email: email });
        if (!tempCode) throw new Error("Invalid Code");
        console.log('correct code: ' + tempCode.passcode);
        if (Number(enteredOTP) !== Number(tempCode.passcode)) {
            throw new Error('Hmm... your code was incorrect. Please try again.');
        } else {
            tempOTPS.deleteOne({
                passcode: enteredOTP
            })
                .then(function () {
                    console.log('successfuly deleted');
                }).catch(function (error) {
                    console.log(error); // Failure
                });
        }
        res.status(200).json("success");
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }

})

//Reset password
app.post("/updateUserPass", async (req, res) => {
    try {
        const { email, password } = req.body

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = await User.findOne({ email: email })
        if (!userData) throw new Error("Unexpected error occured");

        User.updateOne({
            "_id": userData._id.toString()
        }, {
            "password": hashedPassword
        })
            .then((obj) => {
                console.log("Updated Password");
            })
            .catch((err) => {
                console.log(err);
            })

        sendChangePasswordConfirmation(email);

        res.json({ redirect: '/signin' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

function sendChangePasswordConfirmation(emailAddress) {
    const changePassConfirmation = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'Password Has Been Changed - Ensure Your Account\'s Safety',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -8) + '/frontend/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <h1 style="margin-bottom: 2rem;">Did you change your password?</h1>
        <p>We noticed the password for your KEMLabels' account was recently changed. If this was you, rest assured that your new password is now in effect. No further action is required and you can safely ignore this email.</p>
        <p>However, if you did not request this change, please contact our support team immediately at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team!</p>
        </div>`,
    }
    transporter.sendMail(changePassConfirmation, function (err, info) {
        if (err) console.log(err)
    });
}

//404 NOT FOUND
app.get('*', (req, res) => {
    throw new Error('PAGE NOT FOUND');
})

app.use(handleErr);

connectDB().then(() => {
    app.listen(process.env.PORT, () => {
        console.log("Server started on port " + process.env.PORT);
    })
})