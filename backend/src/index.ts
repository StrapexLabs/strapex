import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { SessionData } from 'types';
import * as dotenv from "dotenv";
import sgMail, { MailDataRequired } from '@sendgrid/mail';
import PDFDocument from 'pdfkit';
import path from 'path';
import mailgun from 'mailgun-js';
dotenv.config();


const app = express();
app.use(cors());
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

const server = http.createServer(app);

// MongoDB connection URL
const mongoURL = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;

// Create a new MongoClient
const client = new MongoClient(mongoURL);

// Handler for creating a new session
app.post('/api/sessions', async (req, res) => {
    try {

        console.log('Request body:', req.body);
        // Extract the necessary data from the request body
        const { successUrl, cancelUrl, lineItems, depositAddress, shipping_address_collection, payment_type, billing_address_collection
        } = req.body;

        // Generate a unique session ID
        const sessionId = generateUniqueSessionId();

        // Replace {CHECKOUT_SESSION_ID} with the actual session ID in the URLs
        const updatedSuccessUrl = successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId);
        const updatedCancelUrl = cancelUrl.replace('{CHECKOUT_SESSION_ID}', sessionId);

        // Connect to the MongoDB database
        await client.connect();
        const db = client.db(dbName);
        const sessions = db.collection('sessions');

        // Initialize totalPrice
        let totalPrice = 0;

        // Iterate through the lineItems and calculate the total price
        lineItems.forEach((item: any) => {
            totalPrice += parseFloat(item.price) * item.quantity;
        });

        // Format totalPrice to handle small values accurately
        totalPrice = parseFloat(totalPrice.toFixed(4));

        // Create the session data object
        const sessionData: SessionData = {
            sessionId,
            totalPrice,
            totalPriceToken: lineItems[0].currency,
            successUrl: updatedSuccessUrl,
            cancelUrl: updatedCancelUrl,
            payment_type,
            lineItems,
            depositAddress,
            status: 'pending',
        };

        // Add the billing_address_collection field to the session data if it exists in the request body
        if (billing_address_collection) {
            sessionData.billing_address_collection = billing_address_collection;
        }

        if (shipping_address_collection) {
            sessionData.shipping_address_collection = shipping_address_collection;
        }

        // Insert the session data into the MongoDB collection
        await sessions.insertOne(sessionData);

        // Return the session ID and the URL to redirect the user to
        res.status(200).json({
            id: sessionId,
            url: `/strapex/p/${sessionId}`,
        });
    } catch (err) {
        console.error('Error creating session:', err);
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' });
    } finally {
        // Close the MongoDB connection
        await client.close();
    }
});

// Handler for retrieving session data by session ID
app.get('/api/sessions/:sessionId', async (req, res) => {
    const sessionId = req.params.sessionId;

    console.log('Session ID:', sessionId);

    try {
        // Connect to the MongoDB database
        await client.connect();
        const db = client.db(dbName);
        const sessions = db.collection('sessions');

        // Find the session document based on the session ID
        const session = await sessions.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({ statusCode: 404, message: 'Session not found' });
        }

        res.status(200).json(session);
    } catch (err) {
        console.error('Error retrieving session:', err);
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' });
    } finally {
        // Close the MongoDB connection
        await client.close();
    }
});


//Health check endpoint
import { generateHeader, generateCustomerInformation, generateInvoiceTable, generateFooter } from './utils/pdfGenerator';

app.get('/health', (req, res) => {
    console.log('Health check');
    res.status(200).send('OK');
});

app.post('/sendEmail', async (req, res) => {
    const { sessionId } = req.body;

    try {
        // Connect to the MongoDB database
        await client.connect();
        const db = client.db(dbName);
        const sessions = db.collection('sessions');

        // Find the session document based on the session ID
        const session = await sessions.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({ statusCode: 404, message: 'Session not found' });
        }

        // Get the email from the session data
        const recipientEmail = session.contactInformation?.email;

        if (!recipientEmail) {
            return res.status(400).json({ statusCode: 400, message: 'Recipient email not found in session data' });
        }

        // Create a new PDF document
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);

            // Save the PDF locally
            const fs = require('fs');
            const path = require('path');
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }
            const pdfPath = path.join(tempDir, 'invoice.pdf');
            fs.writeFileSync(pdfPath, pdfData);

            // Use Mailgun to send the email
            const DOMAIN = process.env.MAILGUN_EMAIL_DOMAIN; // Example: "mail.strapex.org"
            const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: DOMAIN });
            const data: mailgun.messages.SendData = {
                from: "orders@strapex.org",
                to: recipientEmail,
                subject: "Your Invoice",
                text: "Please find your invoice attached.",
                attachment: new mg.Attachment({ data: pdfData, filename: 'invoice.pdf', contentType: 'application/pdf' })
            };
            mg.messages().send(data, function (error, body) {
                if (error) {
                    console.error("Error sending email:", error);
                    res.status(500).json({ statusCode: 500, message: 'Internal Server Error' });
                } else {
                    console.log("Email sent:", body);
                    res.status(200).json({ message: 'Email sent successfully' });
                }
            });
        });

        // Generate PDF content
        generateHeader(doc);
        generateCustomerInformation(doc, session);
        generateInvoiceTable(doc, session);
        generateFooter(doc);

        // Finalize the PDF and end the stream
        doc.end();
    } catch (err) {
        console.error('Error generating invoice:', err);
        res.status(500).json({ statusCode: 500, message: 'Internal Server Error' });
    } finally {
        // Close the MongoDB connection
        await client.close();
    }
});

//Check health of mongoDB o no
app.get('/health/mongo', async (req, res) => {
    try {
        await client.connect();
        res.status(200).send('MongoDB is up and running');
    } catch (err) {
        res.status(500).send('MongoDB is down');
    } finally {
        await client.close();
    }
});
// Start the server
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Function to generate a unique session ID
function generateUniqueSessionId() {
    return `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}