const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have name'],
    trim: true,
    maxlength: [40, 'A user name must be less than or equal to 40 characters'],
    minlength: [4, 'A user name must be more than or equal to 4 characters'],
  },
  email: {
    type: String,
    validate: [validator.isEmail, 'Please provide a valid email'],
    unique: [true, 'This email is already registered'],
    lowercase: true,
  },
  photo: String,
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'lead-guide', 'guide'],
      message:
        'Role should be one among these : user, admin, guide, lead-guide',
    },
    default: 'user',
  },
  password: {
    type: String,
    validate: {
      validator: function (val) {
        const passwordRegex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
        return passwordRegex.test(val);
      },
      message: 'Invalid password',
    },
    minlength: [8, 'Password should be equal to more than 8 characters'],
    required: [true, 'Password required!'],
    select: false,
  },
  confirmPassword: {
    type: String,
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: 'Confirm password should match Password',
    },
    required: [true, 'Confirm Password required!'],
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
});

userSchema.pre('save', async function (next) {
  // Only run this function if password is modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete the confirm password
  this.confirmPassword = undefined;

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPassword = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  console.log({resetToken}, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000 ;
  
  return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;
