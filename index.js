// Import the necessary modules
const express = require("express"); // Express is a web application framework for Node.js.
const cors = require("cors"); // CORS middleware for handling cross-origin resource sharing.
const path = require("path"); // Path module to handle file paths.
const PropertiesReader = require("properties-reader"); // PropertiesReader to read .properties files for configuration.
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // MongoDB client utilities, including ObjectId for MongoDB's unique identifiers.

// Create an instance of the Express application.
const app = express(); 

// Enable Cross-Origin Resource Sharing (CORS) with specific configurations.
app.use(cors({ 
  origin: "https://mc-2001.github.io", // Only allow requests from this domain.
  methods: "GET,POST,PUT,DELETE", // Specify allowed HTTP methods.
  allowedHeaders: "Content-Type" // Allow only the "Content-Type" header in requests.
}));

app.use(express.json()); // Middleware to automatically parse JSON in the body of incoming requests.
app.set("json spaces", 3); // Set the number of spaces for pretty-printing JSON responses to 3.

// Load the database configuration from a .properties file.
const propertiesPath = path.resolve(__dirname, "./dbconnection.properties"); // Resolve the path to the .properties file.
const properties = PropertiesReader(propertiesPath); // Read the .properties file into a JavaScript object.

// Extract database connection details from the .properties file.
const dbPrefix = properties.get("db.prefix"); // Database prefix, e.g., MongoDB protocol (mongodb://).
const dbHost = properties.get("db.host"); // Host address of the database (e.g., localhost or remote IP).
const dbName = properties.get("db.name"); // The name of the database to connect to.
const dbUser = properties.get("db.user"); // Username for authenticating with the database.
const dbPassword = properties.get("db.password"); // Password for authenticating with the database.
const dbParams = properties.get("db.params"); // Any additional parameters needed for the MongoDB connection.

// Build the MongoDB connection URI with the extracted properties.
const uri = `${dbPrefix}${dbUser}:${encodeURIComponent(dbPassword)}${dbHost}${dbParams}`; 

// Create a MongoDB client with the URI and specify the server API version.
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

// Declare a variable to hold the database reference once connected.
let db1;

// Serve static files (e.g., HTML, CSS, JS) from the current directory.
app.use(express.static(path.join(__dirname)));

// Async function to connect to MongoDB.
async function connectDB() {
  try {
    await client.connect(); // Attempt to connect to the MongoDB server.
    console.log("Connected to MongoDB"); // Log success message upon successful connection.
    db1 = client.db(dbName); // Assign the database reference to the db1 variable.
  } catch (err) {
    console.error("MongoDB connection error:", err); // Log error if connection fails.
    process.exit(1); // Exit the application if the connection fails.
  }
}

connectDB(); // Call the function to initialize the MongoDB connection.

// Middleware to attach the correct collection based on the route parameter.
app.param("collectionName", async function (req, res, next, collectionName) {
  try {
    req.collection = db1.collection(collectionName); // Attach the specified collection to the request object.
    console.log("Middleware set collection:", req.collection.collectionName); // Log which collection was set.
    next(); // Continue processing the request.
  } catch (err) {
    console.error("Error in collection middleware:", err); // Log errors that occur in the middleware.
    res.status(500).json({ error: "Invalid collection name" }); // Send a 500 response if collection setup fails.
  }
});

// Helper function to return the "Lessons" collection reference.
function lessonsCollection() {
  return db1.collection("Lessons"); // Return the Lessons collection.
}

// Helper function to return the "Orders" collection reference.
function ordersCollection() {
  return db1.collection("Orders"); // Return the Orders collection.
}

// Validation helper function for lessons data.
const validateLesson = (lesson) => {
  // Ensure that the lesson has required fields: subject, location, and a numeric price.
  if (!lesson.subject || !lesson.location || typeof lesson.price !== "number") {
    return "Lesson must include subject, location, and numeric price."; // Return error message if validation fails.
  }
  return null; // Return null if validation passes.
};

// Validation helper function for orders data.
const validateOrder = (order) => {
  // Ensure that the order has required fields: lessonId, customerName, and a numeric quantity.
  if (!order.lessonId || !order.customerName || typeof order.quantity !== "number") {
    return "Order must include lessonId, customerName, and numeric quantity."; // Return error message if validation fails.
  }
  return null; // Return null if validation passes.
};

// POST-ORDER request handler to create a new order.
app.post("/Kitten/Orders", async (req, res) => {
  const { name, phone, items, total, date } = req.body;

  // Check if required order data is provided, return 400 if invalid.
  if (!name || !phone || !items || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  try {
    // Map the order items into the desired structure for the database.
    const orders = items.map((item) => ({
      lessonId: item.lessonId, // Include the lessonId for each item.
      customerName: name,
      quantity: 1, // Default quantity to 1 for each item.
      total,
      date,
    }));

    // Insert multiple orders into the database at once.
    const result = await ordersCollection().insertMany(orders); 

    // Respond with a success message and the inserted order IDs.
    res.status(201).json({
      message: "Order placed successfully",
      insertedIds: result.insertedIds,
    });
  } catch (err) {
    console.error("Error adding order:", err); // Log any errors encountered during order creation.
    res.status(500).json({ error: "Failed to add order" }); // Respond with a 500 error on failure.
  }
});

// GET request handler to retrieve all lessons from the database.
app.get("/Kitten/Lessons", async (req, res) => {
  try {
    // Fetch all lessons from the database.
    const results = await lessonsCollection().find({}).toArray();
    console.log("Retrieved data:", results); // Log the fetched results.
    res.json(results); // Return the lessons in the response.
  } catch (err) {
    console.error("Error fetching lessons:", err); // Log errors encountered during the fetch.
    res.status(500).json({ error: "Failed to fetch lessons" }); // Respond with a 500 error on failure.
  }
});

// GET request handler to retrieve a specific lesson by its ID.
app.get("/Kitten/Lessons/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" }); // Return 400 if ID format is invalid.
  }

  try {
    // Fetch the lesson with the given ID.
    const lesson = await lessonsCollection().findOne({ _id: new ObjectId(req.params.id) });
    if (lesson) {
      res.json(lesson); // Return the found lesson.
    } else {
      res.status(404).json({ error: "Lesson not found" }); // Return 404 if the lesson is not found.
    }
  } catch (err) {
    console.error("Error fetching lesson by ID:", err); // Log errors encountered during the fetch.
    res.status(500).json({ error: "Failed to fetch lesson" }); // Respond with a 500 error on failure.
  }
});

// POST request handler to create a new lesson.
app.post("/Kitten/Lessons", async (req, res) => {
  const error = validateLesson(req.body); // Validate the incoming lesson data.
  if (error) return res.status(400).json({ error }); // Return 400 if validation fails.

  try {
    const lesson = req.body; // Get the lesson data from the request body.
    const result = await lessonsCollection().insertOne(lesson); // Insert the new lesson into the database.

    res.status(201).json({
      ...lesson, // Return the created lesson data along with its generated _id.
      _id: result.insertedId,
    });
  } catch (err) {
    console.error("Error adding lesson:", err); // Log errors encountered during lesson creation.
    res.status(500).json({ error: "Failed to add lesson" }); // Respond with a 500 error on failure.
  }
});

// PUT request handler to update a lesson by its ID.
app.put("/Kitten/Lessons/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" }); // Return 400 if ID format is invalid.
  }

  const error = validateLesson(req.body); // Validate the updated lesson data.
  if (error) return res.status(400).json({ error }); // Return 400 if validation fails.

  try {
    // Update the lesson with the given ID.
    const result = await lessonsCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" }); // Return 404 if lesson is not found.
    }

    res.json({ message: "Lesson updated successfully" }); // Return success message if the update is successful.
  } catch (err) {
    console.error("Error updating lesson:", err); // Log errors encountered during lesson update.
    res.status(500).json({ error: "Failed to update lesson" }); // Respond with a 500 error on failure.
  }
});

// DELETE request handler to delete a lesson by its ID.
app.delete("/Kitten/Lessons/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" }); // Return 400 if ID format is invalid.
  }

  try {
    // Delete the lesson with the given ID.
    const result = await lessonsCollection().deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" }); // Return 404 if the lesson is not found.
    }

    res.json({ message: "Lesson deleted successfully" }); // Return success message if the deletion is successful.
  } catch (err) {
    console.error("Error deleting lesson:", err); // Log errors encountered during lesson deletion.
    res.status(500).json({ error: "Failed to delete lesson" }); // Respond with a 500 error on failure.
  }
});

// Global error handler middleware to catch unhandled errors.
app.use((err, req, res, next) => {
  console.error("Global error handler:", err); // Log the error.
  res.status(500).json({ error: "An internal server error occurred" }); // Return 500 internal server error response.
});

// Start the server on port 3000.
const PORT = 3000; 
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Log that the server has started successfully.
});
