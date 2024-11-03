import PDFDocument from 'pdfkit';
import path from 'path';

export function generateHeader(doc: any) {
    doc
        .image(path.join(__dirname, '../public', 'logo.png'), 50, 45, { width: 50 })
        .fillColor("#444444")
        .fontSize(20)
        .text("Strapex Inc.", 110, 57)
        .fontSize(10)
        .text("Strapex Inc.", 200, 50, { align: "right" })
        .text("123 Main Street", 200, 65, { align: "right" })
        .text("New York, NY, 10025", 200, 80, { align: "right" })
        .moveDown();
}

export function generateCustomerInformation(doc: any, session: any) {
    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Invoice", 50, 160);

    generateHr(doc, 185);

    const customerInformationTop = 200;

    doc
        .fontSize(10)
        .text("Session ID:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(session.sessionId, 150, customerInformationTop)
        .font("Helvetica")
        .text("Total Price:", 50, customerInformationTop + 15)
        .text(`${session.totalPrice} ${session.totalPriceToken}`, 150, customerInformationTop + 15)
        .text("Payment Type:", 50, customerInformationTop + 30)
        .text(session.payment_type, 150, customerInformationTop + 30)
        .text("Status:", 50, customerInformationTop + 45)
        .text(session.status, 150, customerInformationTop + 45)

        .font("Helvetica-Bold")
        .text(session.contactInformation.name + " " + session.contactInformation.surname, 300, customerInformationTop)
        .font("Helvetica")
        .text(session.contactInformation.email, 300, customerInformationTop + 15)
        .text(session.contactInformation.phoneNumber, 300, customerInformationTop + 30)
        .moveDown();

    generateHr(doc, 252);
}

export function generateInvoiceTable(doc: any, session: any) {
    const invoiceTableTop = 330;

    doc.font("Helvetica-Bold");
    generateTableRow(
        doc,
        invoiceTableTop,
        "Item",
        "Description",
        "Price",
        "Quantity",
        "Total"
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font("Helvetica");

    session.lineItems.forEach((item: any, index: any) => {
        const position = invoiceTableTop + (index + 1) * 30;
        generateTableRow(
            doc,
            position,
            `Item ${index + 1}`,
            item.name,
            `${item.price} ${item.currency}`,
            item.quantity,
            `${item.price * item.quantity} ${item.currency}`
        );
        generateHr(doc, position + 20);
    });
}

export function generateFooter(doc: any) {
    doc
        .fontSize(10)
        .text(
            "Thank you for your business.",
            50,
            780,
            { align: "center", width: 500 }
        );
}

export function generateTableRow(doc: any, y: any, item: any, description: any, unitCost: any, quantity: any, lineTotal: any) {
    doc
        .fontSize(10)
        .text(item, 50, y)
        .text(description, 150, y)
        .text(unitCost, 280, y, { width: 90, align: "right" })
        .text(quantity, 370, y, { width: 90, align: "right" })
        .text(lineTotal, 0, y, { align: "right" });
}

export function generateHr(doc: any, y: any) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}