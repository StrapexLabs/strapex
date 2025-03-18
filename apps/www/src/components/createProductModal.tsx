// CreateProductModal.tsx
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  RadioGroup,
  Select,
  RadioCards,
  Blockquote,
} from "@radix-ui/themes";
import { useEffect, useState } from "react";
import * as Realm from "realm-web";

import { app } from "../../realmconfig";

import { useProvider } from "@/contexts/ProviderContext";
import { useUser } from "@/contexts/UserContext";
import { getDatabaseName } from "@/services/databaseService";
import { Product } from "@/types";
type ProductType = "onetime" | "recurring";

type CreateProductModalProps = {
  addresses: string[];
};

const CreateProductModal = ({ addresses }: CreateProductModalProps) => {
  const [productType, setProductType] = useState<ProductType>("onetime");
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(addresses[0]);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const providerContext = useProvider();
  const userContext = useUser();

  const handleProductTypeChange = (value: ProductType) => {
    console.log("Product type changed:", value);
    setProductType(value);
  };

  useEffect(() => {
    console.log("selectedAddress", selectedAddress);
  }, [selectedAddress]);

  const handleCreateProduct = async () => {
    setError(""); // Reset error message before processing
    try {
      if (!userContext?.address) {
        setError("User address not found");
        return;
      }

      if (!selectedAddress) {
        console.log("selectedAddress", selectedAddress);
        setError("Address is required");
        return;
      }

      const parsedPrice = parseFloat(productPrice);
      if (isNaN(parsedPrice)) {
        setError("Invalid price format");
        return;
      }

      if (app.currentUser == null) {
        setError("User not found");
        return;
      }

      if (!providerContext) {
        setError("Provider not found");
        return;
      }

      const databaseName = getDatabaseName(providerContext);
      if (!databaseName) {
        setError("Database name not found");
        return;
      }

      setError("");

      const mongodb = app.currentUser?.mongoClient("mongodb-atlas");
      const collection = mongodb?.db(databaseName).collection("products");

      const newProduct: Product = {
        payment_type: productType,
        name: productName,
        price: parsedPrice,
        token:
          "0x049D36570D4e46f48e99674bd3fcc84644DdD6b96F7C741B1562B82f9e004dC7",
        address: selectedAddress,
        createdAt: new Date(),
        owner: userContext?.address,
      };

      try {
        await collection?.insertOne(newProduct);
        console.log("Product created successfully:", newProduct);
        setProductName("");
        setProductPrice("");

        setIsOpen(false);
      } catch (error: any) {
        setError("Error creating product: " + error.message);
      }
    } catch (error: any) {
      setError("Error creating product: " + error.message);
    }
  };

  return (
    <Dialog.Root open={isOpen}>
      <Dialog.Trigger className="bg-main rounded-md px-4 py-2 text-white">
        <Button onClick={() => setIsOpen(true)} className="bg-main text-white">
          Create a product
        </Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Create a product</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Fill in the details to create a new product.
        </Dialog.Description>
        {error && (
          <Blockquote>
            <Text color="red" size="2">
              {error}
            </Text>
          </Blockquote>
        )}
        <Flex direction="column" gap="3">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Product Type
            </Text>
            <RadioCards.Root
              defaultValue="one-time"
              name="productType"
              onValueChange={handleProductTypeChange}
            >
              <RadioCards.Item value="one-time">
                <Flex direction="column" width="100%">
                  <Text>One-time</Text>
                </Flex>
              </RadioCards.Item>
              <RadioCards.Item value="recurring">
                <Flex direction="column" width="100%">
                  <Text weight="bold">Recurring</Text>
                </Flex>
              </RadioCards.Item>
            </RadioCards.Root>
          </label>
          <label>
            <Select.Root onValueChange={(value) => setSelectedAddress(value)}>
              <Select.Trigger />
              <Select.Content>
                <Select.Group>
                  <Select.Label>Addresses</Select.Label>
                  {addresses.map((address) => (
                    <Select.Item key={address} value={address}>
                      {address}
                    </Select.Item>
                  ))}
                </Select.Group>
              </Select.Content>
            </Select.Root>
          </label>
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Product Name
            </Text>
            <TextField.Root
              defaultValue={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Enter the product name"
            />
          </label>
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Price (ETH)
            </Text>
            <TextField.Root
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              placeholder="Enter the price in ETH"
            />
          </label>
        </Flex>
        <Flex gap="3" mt="4" justify="end">
          <Button onClick={() => setIsOpen(false)} variant="soft" color="gray">
            Cancel
          </Button>

          <Button onClick={handleCreateProduct} className="bg-main text-white">
            Create
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default CreateProductModal;
