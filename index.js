const express = require("express"); // Import the Express library to create a web server.
const cors = require("cors"); // Import the CORS middleware to handle cross-origin resource sharing.
const path = require("path"); // Import the Path module to handle file paths.
const PropertiesReader = require("properties-reader"); // Import the PropertiesReader library to read .properties files.
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // Import MongoDB utilities to interact with the database.

const app = express(); // Create an Express application instance.

app.use(cors({ // Enable CORS with specified configurations.
  origin: "https://mc-2001.github.io", // Allow requests only from this specific domain.
  methods: "GET,POST,PUT,DELETE", // Specify allowed HTTP methods.
  allowedHeaders: "Content-Type" // Specify allowed headers in requests.
}));

app.use(express.json()); // Enable JSON parsing for incoming request bodies.
app.set("json spaces", 3); // Format JSON responses with 3 spaces for readability.

// Load properties from the file.
const propertiesPath = path.resolve(__dirname, "./dbconnection.properties"); // Get the absolute path to the properties file.
const properties = PropertiesReader(propertiesPath); // Read the properties file.

// Extract values from the properties file.
const dbPrefix = properties.get("db.prefix"); // Database prefix (e.g., MongoDB protocol).
const dbHost = properties.get("db.host"); // Host address of the database.
const dbName = properties.get("db.name"); // Name of the database.
const dbUser = properties.get("db.user"); // Database username.
const dbPassword = properties.get("db.password"); // Database password.
const dbParams = properties.get("db.params"); // Additional database parameters.

// Construct MongoDB connection URL.
const uri = `${dbPrefix}${dbUser}:${encodeURIComponent(dbPassword)}${dbHost}${dbParams}`; // Build a secure MongoDB connection URI.

// Create a MongoClient with options to set the Stable API version.
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 }); // Initialize MongoDB client with API version.

let db1; // Declare a variable to store the database reference// Kitten

// Serve static files from the current directory.
app.use(express.static(path.join(__dirname))); // Serve files in the server's directory as static assets.

// Connect to MongoDB.
async function connectDB() {
  try {
    await client.connect(); // Establish a connection to the MongoDB server.
    console.log("Connected to MongoDB"); // Log successful connection.
    db1 = client.db(dbName); // Reference the specific database.
  } catch (err) {
    console.error("MongoDB connection error:", err); // Log connection errors.
    process.exit(1); // Terminate the application if connection fails.
  }
}

connectDB(); // Initialize database connection.

// Middleware to set collection based on the route.
app.param("collectionName", async function (req, res, next, collectionName) {
  try {
    req.collection = db1.collection(collectionName); // Attach the collection to the request object.
    console.log("Middleware set collection:", req.collection.collectionName); // Log the selected collection.
    next(); // Pass control to the next middleware.
  } catch (err) {
    console.error("Error in collection middleware:", err); // Log middleware errors.
    res.status(500).json({ error: "Invalid collection name" }); // Return error response for invalid collection names.
  }
});

// Reference the Lessons collection.
function lessonsCollection() {
  return db1.collection("Lessons"); // Helper function to get the "Lessons" collection reference.
}

// Reference the Orders collection.
function ordersCollection() {
  return db1.collection("Orders"); // Helper function to get the "Orders" collection reference.
}

// Validation helpers.
const validateLesson = (lesson) => {
  if (!lesson.subject || !lesson.location || typeof lesson.price !== "number") {
    return "Lesson must include subject, location, and numeric price.";
  }
  return null;
};

const validateOrder = (order) => {
  if (!order.lessonId || !order.customerName || typeof order.quantity !== "number") {
    return "Order must include lessonId, customerName, and numeric quantity.";
  }
  return null;
};

// POST an order.
app.post("/Kitten/Orders", async (req, res) => {
  const { name, phone, items, total, date } = req.body;

  if (!name || !phone || !items || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  try {
    // Map items into the desired structure for the database
    const orders = items.map((item) => ({
      lessonId: item.lessonId, // Ensure lessonId is present in each item
      customerName: name,
      quantity: 1, // Assuming 1 quantity per item (adjust if needed)
      total,
      date,
    }));

    const result = await ordersCollection().insertMany(orders); // Save all items at once

    res.status(201).json({
      message: "Order placed successfully",
      insertedIds: result.insertedIds,
    });
  } catch (err) {
    console.error("Error adding order:", err);
    res.status(500).json({ error: "Failed to add order" });
  }
});


// GET all lessons.
app.get("/Kitten/Lessons", async (req, res) => {
  try {
    const results = await lessonsCollection().find({}).toArray();
    console.log("Retrieved data:", results);
    res.json(results);
  } catch (err) {
    console.error("Error fetching lessons:", err);
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
});

// GET lesson by ID.
app.get("/Kitten/Lessons/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const lesson = await lessonsCollection().findOne({ _id: new ObjectId(req.params.id) });
    if (lesson) {
      res.json(lesson);
    } else {
      res.status(404).json({ error: "Lesson not found" });
    }
  } catch (err) {
    console.error("Error fetching lesson by ID:", err);
    res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

// POST a new lesson.
app.post("/Kitten/Lessons", async (req, res) => {
  const error = validateLesson(req.body);
  if (error) return res.status(400).json({ error }); // Bad Request for invalid data.

  try {
    const lesson = req.body;
    const result = await lessonsCollection().insertOne(lesson);

    res.status(201).json({
      ...lesson,
      _id: result.insertedId,
    });
  } catch (err) {
    console.error("Error adding lesson:", err);
    res.status(500).json({ error: "Failed to add lesson" });
  }
});

// PUT update lesson by ID.
app.put("/Kitten/Lessons/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  const error = validateLesson(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const result = await lessonsCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json({ message: "Lesson updated successfully" });
  } catch (err) {
    console.error("Error updating lesson:", err);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

// DELETE a lesson by ID.
app.delete("/Kitten/Lessons/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  try {
    const result = await lessonsCollection().deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    res.json({ message: "Lesson deleted successfully" });
  } catch (err) {
    console.error("Error deleting lesson:", err);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

// Global error handler.
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "An internal server error occurred" });
});

// Start the server.
const PORT = 3000; // Define the port for the server.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
