import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, "Email is required."], 
    unique: true 
  },
  password: { 
    type: String, 
    required: [true, "Password is required."] 
  },
  firstName: { 
    type: String, 
    default: "" // Required by the API spec for profile management
  },
  lastName: { 
    type: String, 
    default: "" // Required by the API spec for profile management
  },
  image: { 
    type: String, 
    default: "" // Maps to the 'image' field in the spec instead of 'avatar'
  },
  color: { 
    type: String, 
    default: "" // Used for profile UI as shown in Update Profile spec
  },
  profileSetup: { 
    type: Boolean, 
    default: false // Critical flag used by the frontend to redirect new users
  },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);