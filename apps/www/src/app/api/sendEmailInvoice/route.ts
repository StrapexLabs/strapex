import mailgun from "mailgun-js";
import { MongoClient } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

const feedbacklink = "https://05k010cdjbr.typeform.com/to/gRHjqyKm";
export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  let client;
  console.log("Sending email invoice for session:", sessionId);
  try {
    const connectionString = process.env.DB_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("DB connection string is not defined");
    }

    client = new MongoClient(connectionString);
    await client.connect();
    const db = client.db("StrapexDB");
    const sessions = db.collection("sessions");

    // Find the session document based on the session ID
    const session = await sessions.findOne({ sessionId });

    if (!session) {
      return NextResponse.json(
        { statusCode: 404, message: "Session not found" },
        { status: 404 },
      );
    }

    // Get the email from the session data
    const recipientEmail = session.contactInformation?.email;

    if (!recipientEmail) {
      return NextResponse.json(
        {
          statusCode: 400,
          message: "Recipient email not found in session data",
        },
        { status: 400 },
      );
    }

    // Generate HTML content for the invoice
    const invoiceHtml = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .customer-info, .invoice-table, .footer { margin-bottom: 20px; }
                    .invoice-table table { width: 100%; border-collapse: collapse; }
                    .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 8px; }
                    .invoice-table th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Strapex Inc.</h1>
                    <!-- <p>123 Main Street, New York, NY, 10025</p> -->
                </div>
                <div class="customer-info">
                    <h2>Invoice</h2>
                    <p>Vendor: StarknetStore</p>
                    <p>Session ID: ${session.sessionId}</p>
                    <p>Total Price: ${session.totalPrice} ${session.totalPriceToken}</p>
                </div>
                <div class="invoice-table">
                    <h3>Items</h3>
                    <table>
                        <tr>
                            <th>Name</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                        </tr>
                        ${session.lineItems
                          .map(
                            (item: any) => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.price} ${item.currency}</td>
                            <td>${item.quantity}</td>
                            <td>${item.price * item.quantity} ${item.currency}</td>
                        </tr>`,
                          )
                          .join("")}
                    </table>
                </div>
                <div class="footer">
                    <p>Complete the feedback for a 25% refund: <a href="${feedbacklink}">${feedbacklink}</a></p>
                    <p>Thank you for purchasing with Strapex!</p>
                </div>
                <div class="logo">
                    <img src="https://starknetstore.com/StarknetStore-black.png" alt="StarknetStore Logo" style="width: 150px; margin-top: 20px;">
                </div>
            </body>
            </html>
        `;
    // Use Mailgun to send the email
    const DOMAIN = "mail.strapex.org";
    const mg = mailgun({
      apiKey: process.env.MAILGUN_API_KEY || "",
      domain: DOMAIN,
    });
    const data: mailgun.messages.SendData = {
      from: "orders@strapex.org",
      to: [recipientEmail, "ceo@strapex.org"],
      subject: "Your Invoice",
      html: invoiceHtml,
    };
    mg.messages().send(data, function (error, body) {
      if (error) {
        console.error("Error sending email:", error);
        return NextResponse.json(
          { statusCode: 500, message: "Internal Server Error" },
          { status: 500 },
        );
      } else {
        console.log("Email sent:", body);
        return NextResponse.json(
          { message: "Email sent successfully" },
          { status: 200 },
        );
      }
    });
  } catch (err) {
    console.error("Error generating invoice:", err);
    return NextResponse.json(
      { statusCode: 500, message: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
