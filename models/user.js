import mongoose from "mongoose";

const schema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    minlegth: 3,
  },
  friends: [
    {
      ref: "Person",
      type: mongoose.Schema.Types.ObjectId,
    },
  ],
});

export default mongoose.model("User", schema);
