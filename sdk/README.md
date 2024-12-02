# Strapex JavaScript SDK  Design Specification

## Overview

Strapex SDK offer an interface similar to `stripe-js`, providing ecommerce applications with an easy-to-use and modular JavaScript SDK to interact with the Strapex backend, alllowing to have a payment gateaway on Starknet. 

The purpose of this SDK is to provide developers an easy way to interact with the Strapex backend API. It should simplify common operations (e.g., authentication, data retrieval, and transaction management) and streamline integration. 

### **Target Audience**

JavaScript developers working in both frontend and backend environments who need to integrate with Strapex's backend functionality.

### Objectives

- **Modular Initialization**: A core SDK instance should be initialized with an API key and optional configuration settings.
- **Configurable Endpoints**: By default, requests should target a default API point (such as `https://api.strapex.com`), but users can set a custom endpoint.
- **Promise-Based API**: Each method should return a promise to handle async operations.
- **Event-Driven Elements**: Implement events similar to `stripe-js` for handling input changes, focus, and submission events.
- **Error Handling**: Consistently structured error responses that include a message and error code.

---

## Architecture and Modules

The SDK will follow a modular architecture, with each core feature or resource (e.g., `customers`, `orders`, `payments`) implemented as a separate module. These modules will be instantiated within the main SDK instance and accessed via the main API object.

```jsx

strapex-sdk/
├── src/
│   ├── index.js                # Core SDK entry point
│   ├── customers.js            # Customers module
│   ├── orders.js               # Orders module
│   ├── payments.js             # Payments module
│   ├── events.js               # Events module
│   └── utils/
│       ├── axiosInstance.js    # For HTTP requests
│       └── errorHandler.js     # Centralized errors
└── README.md                   # Documentation

```


### Core Modules

1. **SDK Core (`Strapex`)**: Handles initialization and configuration.
2. **Customers**: CRUD operations for customer data.
3. **Orders**: Methods for creating, retrieving, updating, and deleting orders.
4. **Payments**: Manages payment intents and confirms payments.
5. **Events**: Manages event listeners for input fields and form interactions.

---

### Initialization

The SDK should expose a function that accepts an API key and an options object.

```jsx
const strapex = new Strapex(apiKey, options?);
```

**Parameters**:

- `apiKey` (string, required): API key for authentication.
- `options` (object, optional):
    - `endpoint` (string): Override the default API endpoint.
    - `timeout` (number): Request timeout in milliseconds.

---

## Design requirements

### 1. Core SDK Module

**Constructor**: `Strapex(apiKey, options?)`

- Initializes SDK instance with provided configuration.
- Stores the API key and default configuration settings.
- Manages instantiation of resource modules (e.g., `customers`, `orders`, `payments`).

### 2. Customers Module

Handles customer data management, similar to `stripe.customers`.

- **create(data)**: Creates a new customer.
    - **Input**: Customer details (e.g., email, name).
    - **Output**: Promise resolving to customer data object.
- **retrieve(id)**: Retrieves a customer by ID.
    - **Input**: Customer ID.
    - **Output**: Promise resolving to customer data object.
- **update(id, data)**: Updates customer information.
    - **Input**: Customer ID, update data.
    - **Output**: Promise resolving to updated customer object.
- **delete(id)**: Deletes a customer by ID.
    - **Input**: Customer ID.
    - **Output**: Promise resolving to confirmation.

### 3. Orders Module

Handles order management, similar to an e-commerce system's order API.

- **create(data)**: Creates a new order.
    - **Input**: Order details (items, quantities).
    - **Output**: Promise resolving to order data object.
- **retrieve(id)**: Retrieves an order by ID.
    - **Input**: Order ID.
    - **Output**: Promise resolving to order data.
- **update(id, data)**: Updates order details.
    - **Input**: Order ID, update data.
    - **Output**: Promise resolving to updated order object.
- **delete(id)**: Deletes an order.
    - **Input**: Order ID.
    - **Output**: Promise resolving to deletion confirmation.

### 4. Payments Module

Handles payment processing, similar to `stripe.paymentIntents`.

- **createPaymentIntent(amount, currency, options?)**: Initializes a payment intent.
    - **Input**: Amount, currency, and optional metadata.
    - **Output**: Promise resolving to payment intent object.
- **confirmPayment(intentId, paymentMethod)**: Confirms a payment.
    - **Input**: Payment intent ID, payment method.
    - **Output**: Promise resolving to confirmation status.

---

### Events

Events in the SDK should mimic the behavior in `stripe-js`, enabling developers to listen for user interactions.

- **Supported Events**:
    - `change`: Triggered when a form field value changes.
    - `focus`: Triggered when a field is focused.
    - `blur`: Triggered when focus is lost.
    - `submit`: Triggered on form submission.
- **Usage**:
    
    ```jsx
    strapex.events.on('change', (event) => {
      console.log(event.field, event.value);
    });
    ```
    

### Error Handling

Customizable error handling, allowing developers to define custom behavior for errors.

**Example**:

```jsx
try {
  await strapex.orders.create({ itemId, quantity });
} catch (error) {
  console.error('Order creation failed:', error.message);
}
```

### Testing and Quality Assurance

Ensure that the SDK has automated tests covering:

- **Initialization**: Valid and invalid configuration settings.
- **Method Responses**: Proper resolution or rejection of promises.
- **Event Handling**: Event listeners should fire correctly on interaction.
- **Error Handling**: Validation of error object format.

---

## Documentation

Developers building the SDK should maintain comprehensive inline documentation and a README that includes:

- **Setup and Configuration**: How to initialize and configure the SDK.
- **Method Usage**: Examples for each core method.
- **Event Handling**: List of available events and usage examples.
- **Error Codes**: Table of common errors.