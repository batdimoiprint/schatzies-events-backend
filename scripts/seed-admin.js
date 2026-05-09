import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });

try {
  await client.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      PK: { S: "USER#schatzieseventsadmin@gmail.com" },
      SK: { S: "PROFILE" },
      firstName: { S: "Admin" },
      middleName: { S: "" },
      lastName: { S: "Schatzies" },
      email: { S: "schatzieseventsadmin@gmail.com" },
      password: { S: process.env.ADMIN_HASH },
      role: { S: "ADMIN" },
      contactNumber: { S: "" },
      birthDate: { S: "" },
      houseNumber: { S: "" },
      street: { S: "" },
      barangay: { S: "" },
      city: { S: "" },
      country: { S: "" },
      gender: { S: "" },
      isOnline: { BOOL: false },
      isPasswordChanged: { BOOL: false },
      profilePic: { S: "" },
      created_at: { S: new Date().toISOString() }
    },
    ConditionExpression: "attribute_not_exists(PK)"
  }));
  console.log("Admin seeded");
} catch (err) {
  if (err.name === "ConditionalCheckFailedException") {
    console.log("Admin already exists, skipping");
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
}
