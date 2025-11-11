import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Cart from '../models/cartModel.js';
import { isAuth } from '../utils.js';

const cartRouter = express.Router();

// GET cart for logged in user
cartRouter.get(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      res.send(cart);
    } else {
      // Return empty cart if not found
      res.send({
        cartItems: [],
        shippingAddress: {},
        paymentMethod: '',
      });
    }
  })
);

// POST/PUT - Save or update cart
cartRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const { cartItems, shippingAddress, paymentMethod } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });

    if (cart) {
      // Update existing cart
      cart.cartItems = cartItems || cart.cartItems;
      cart.shippingAddress = shippingAddress || cart.shippingAddress;
      cart.paymentMethod = paymentMethod !== undefined ? paymentMethod : cart.paymentMethod;
      const updatedCart = await cart.save();
      res.send(updatedCart);
    } else {
      // Create new cart
      const newCart = new Cart({
        user: req.user._id,
        cartItems: cartItems || [],
        shippingAddress: shippingAddress || {},
        paymentMethod: paymentMethod || '',
      });
      const savedCart = await newCart.save();
      res.status(201).send(savedCart);
    }
  })
);

// DELETE - Clear cart
cartRouter.delete(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      await cart.deleteOne();
      res.send({ message: 'Cart cleared' });
    } else {
      res.send({ message: 'Cart already empty' });
    }
  })
);

export default cartRouter;


