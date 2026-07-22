import { response } from "express";
import UserModel from "../models/userModel.js";

export const createUser = async (request, response) => {
    try {
        const {name, email, avatar} = request.body;

        const userExists = await UserModel.findOne({ email })

        if (userExists) return response.status(200).json(userExists);

        const newUser = await UserModel.create({
            name, email, avatar
        })

        response.status.apply(200).json(newUser)
    } catch (error) {
        response.status(500).json({
            success: false,
            message: error.message
        })
    }
}
export const getUserInfoById = async (request, responseonse) => {}
export const createUsers = async (request, responseonse) => {}