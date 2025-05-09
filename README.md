# **Strapex - Open Source Alternative to Stripe**

Strapex is an open-source payment gateway inspired by Stripe, designed to democratize access to a free, secure, and decentralized way of transacting with businesses. By leveraging Starknet, Strapex enables fast, secure, and cost-effective transactions, while offering the enhanced user experience that Starknet provides.

![Slide4](https://github.com/user-attachments/assets/b9e4e13c-938e-4c29-a684-d94a084c0adf)

---

## **⚠️ Important Considerations**

Due to the transparent nature of blockchain, all transactions are publicly visible on the network. This transparency allows for the tracking of individual purchases and business revenue, which may impact privacy for both customers and businesses.

---

## **Resources**

- **Telegram:** [t.me/strapexlabs](https://t.me/strapexlabs)
- **Figma Design:** [Design Link](https://www.figma.com/design/1ZUxHzVqJw9vlY65cyYyvP/Untitled?node-id=0-1&t=a9OW5jcHrQkMgH0k-1)  
  _Edit permission granted upon issue assignment (please DM on Telegram)._

## **Demo**

Check out the video of the checkout experience [here](https://github.com/user-attachments/assets/9c8908ce-e0cc-44d8-b332-2873ce5cdb5c)

## **How to Contribute**

We welcome contributions from the community! Before contributing, please review the following documents:

- [Code of Conduct](CODE_OF_CONDUCT.md): Guidelines for respectful collaboration.
- [Contributing Guide](CONTRIBUTING.md): Steps for making contributions.
- [License](LICENSE): Legal details about using and contributing to Strapex.

By contributing to this project, you agree to abide by the terms outlined in our [Code of Conduct](CODE_OF_CONDUCT.md) and [License](LICENSE).

## **Dev Setup**

After cloning the repository, duplicate both `.env.example` environment configuration files under `apps/supabase` and `apps/www`:

```sh
cp apps/supabase/.env.example apps/supabase/.env
cp apps/www/.env.example apps/www/.env
```

We use Docker to launch every components of Strapex in development mode, make sure to install Docker on your system then run `docker compose up` in the root directory.
This command will launch everything needed to work with Strapex:

- Katana (Starknet Devnet) at http://localhost:5050 along with an explorer at http://localhost:5050/explorer
- Supabase local development studio at http://localhost:8082
- Strapex frontend at http://localhost:3000

To interact with the Strapex contracts in the frontend, you will need to add the Katana Devnet in your Wallet networks:

- Network name: Katana
- Chain ID: KATANA
- RPC URL: http://localhost:5050
- Account class hash: 0x07dc7899aa655b0aae51eadff6d801a58e97dd99cf4666ee59e704249e51adf2
- Fee Token Address: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- Block explorer URL: http://localhost:5050/explorer

Then import one of Katana predeployed funded accounts in your Wallet using its private key:

```
| Account address |  0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec
| Private key     |  0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912
| Public key      |  0x33246ce85ebdc292e6a5c5b4dd51fab2757be34b8ffda847ca6925edf31cb67
```

## **Licenses and Notices**

- This project is licensed under the [Apache 2.0](LICENSE).
- For third-party libraries and resources, refer to our [NOTICE](NOTICE) file.

## **Future Improvements**

We’re committed to continuously improving Strapex. If you have feature requests, bug reports, or general feedback, feel free to:

1. Open an issue in this repository.
2. Join our [Telegram](https://t.me/strapexlabs) and share your ideas.

## **Contributors**

<a href="https://github.com/StrapexLabs/strapex/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=StrapexLabs/strapex" />
</a>
