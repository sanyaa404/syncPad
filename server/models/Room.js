const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    language: {
        type: String,
        default: 'javascript',
        enum: ['javascript', 'python', 'cpp', 'java', 'typescript']
    },
    code: {
        type: String,
        default: ''
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);