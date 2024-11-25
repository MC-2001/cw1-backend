const express = require("express"); // Import the Express library to create a web server.
const cors = require("cors"); // Import the CORS middleware to handle cross-origin resource sharing.
const path = require("path"); // Import the Path module to handle file paths.
const PropertiesReader = require("properties-reader"); // Import the PropertiesReader library to read .properties files.
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // Import MongoDB utilities to interact with the database.

const app = express(); // Create an Express application instance

app.use(cors({ // Enable CORS with specified configurations
  origin: "https://mc-2001.github.io", // Allow requests only from this specific domain.
  methods: "GET,POST,PUT,DELETE", // Specify allowed HTTP methods.
  allowedHeaders: "Content-Type" // Specify allowed headers in requests.
}));

app.use(express.json()); // Enable JSON parsing for incoming request bodies.
app.set("json spaces", 3); // Format JSON responses with 3 spaces for readability.

// Load properties from the file
const propertiesPath = path.resolve(__dirname, "./dbconnection.properties"); // Get the absolute path to the properties file.
const properties = PropertiesReader(propertiesPath); // Read the properties file.

// Extract values from the properties file
const dbPrefix = properties.get("db.prefix"); // Database prefix (e.g., MongoDB protocol).
const dbHost = properties.get("db.host"); // Host address of the database.
const dbName = properties.get("db.name"); // Name of the database.
const dbUser = properties.get("db.user"); // Database username.
const dbPassword = properties.get("db.password"); // Database password.
const dbParams = properties.get("db.params"); // Additional database parameters.

// Construct MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${encodeURIComponent(dbPassword)}${dbHost}${dbParams}`; // Build a secure MongoDB connection URI.

// Create a MongoClient with options to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 }); // Initialize MongoDB client with API version.

let db1; // Declare a variable to store the database reference.

// Serve static files from the current directory // Middleware
app.use(express.static(path.join(__dirname))); // Serve files in the server's directory as static assets.

// Connect to MongoDB
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

// Middleware to set collection based on the route
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

// Reference the Lessons collection
function lessonsCollection() {
  return db1.collection("Lessons"); // Helper function to get the "Lessons" collection reference.
}

// GET all lessons
app.get("/Kitten/Lessons", async (req, res) => {
  try {
    const results = await lessonsCollection().find({}).toArray(); // Retrieve all documents in the Lessons collection.
    console.log("Retrieved data:", results); // Log the retrieved data.
    res.json(results); // Send the lessons data as a JSON response.
  } catch (err) {
    console.error("Error fetching lessons:", err); // Log errors while fetching lessons.
    res.status(500).json({ error: "Failed to fetch lessons" }); // Return an error response.
  }
});

// GET lessons by ID
app.get("/Kitten/Lessons/:id", async (req, res) => {
  try {
    const lessonId = req.params.id; // Extract the lesson ID from the request parameters.
    const lesson = await lessonsCollection().findOne({ _id: new ObjectId(lessonId) }); // Find a lesson by its ObjectId.

    if (lesson) {
      res.json(lesson); // Send the lesson if found.
    } else {
      res.status(404).json({ error: "Lesson not found" }); // Return 404 if the lesson doesn't exist.
    }
  } catch (err) {
    console.error("Error fetching lesson by ID:", err); // Log errors while fetching the lesson by ID.
    res.status(500).json({ error: "Failed to fetch lesson" }); // Return an error response.
  }
});

// POST a new lesson
app.post("/Kitten/Lessons/:id", async (req, res) => {
  try {
    const lesson = req.body; // Extract the lesson details from the request body.
    const result = await lessonsCollection().insertOne(lesson); // Insert the new lesson into the collection.

    res.status(201).json({ // Return the inserted lesson with its generated ID.
      ...lesson,
      _id: result.insertedId,
    });
  } catch (err) {
    console.error("Error adding lesson:", err); // Log errors while adding a lesson.
    res.status(500).json({ error: "Failed to add lesson" }); // Return an error response.
  }
});

app.put("/Kitten/Lessons/:id", async (req, res) => {
  try {
    const { lessons } = req.body; // Extract lessons data from the request body.

    // Validate the request body
    if (!lessons || !Array.isArray(lessons)) {
      return res.status(400).json({ error: "Invalid or missing lessons data" });
    }

    // Update availability for each lesson
    for (const lesson of lessons) {
      if (!lesson.id || !lesson.quantity) {
        return res.status(400).json({ error: "Each lesson must have an id and quantity" });
      }

      const result = await lessonsCollection().updateOne(
        { _id: new ObjectId(lesson.id) }, // Match the lesson by its ID.
        { $inc: { availableSlots: -lesson.quantity } } // Decrease the available slots.
      );

      if (result.matchedCount === 0) {
        console.warn(`Lesson with ID "${lesson.id}" not found`); // Warn if the lesson is not found.
      }
    }

    res.status(200).json({ message: "Lesson availability updated successfully" });
  } catch (err) {
    console.error("Error updating lesson availability:", err); // Log errors
    res.status(500).json({ error: "Failed to update lesson availability" });
  }
});



// DELETE a lesson by ID
app.delete("/Kitten/Lessons/:id", async (req, res) => {
  try {
    const result = await lessonsCollection().deleteOne({
      _id: new ObjectId(req.params.id), // Match the lesson by its ID
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" }); // Return 404 if no lesson is deleted.
    }

    res.json({ message: "Lesson deleted successfully" }); // Return success message.
  } catch (err) {
    console.error("Error deleting lesson:", err); // Log errors while deleting the lesson.
    res.status(500).json({ error: "Failed to delete lesson" }); // Return an error response.
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err); // Log errors that reach this handler.
  res.status(500).json({ error: "An internal server error occurred" }); // Return a generic error response.
});

// Start the server
const PORT = 3000; // Define the port for the server.
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Log the server startup message.
});
