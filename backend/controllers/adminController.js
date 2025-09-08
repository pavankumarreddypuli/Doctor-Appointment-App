import validator from "validator"
import bcrypt from "bcrypt"
import { v2 as cloudinary } from "cloudinary"
import doctorModel from "../models/doctorModel.js"
import jwt from 'jsonwebtoken'
import appointmentModel from "../models/appointmentModel.js"
import userModel from "../models/userModel.js"


// API for adding doctor
const addDoctor = async (req, res) => {

    try {

        const { name, email, password, speciality, degree, experience, about, fees, address } = req.body
        const imageFile = req.file

        // Check if imageFile exists before proceeding
        if (!imageFile) {
            return res.json({ success: false, message: "Image file is required." });
        }

        //checking for all data to add doctor
        if (!name || !email || !password || !speciality || !degree || !experience || !about || !fees || !address) {
            return res.json({ success: false, message: "Missing Details" })
        }

        //validating email format
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }

        //validating strong password
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }

        // hashing doctor password       -----The code you provided uses two main functions from the bcrypt library: genSalt() and hash().
        const salt = await bcrypt.genSalt(10)    //This function generates a salt, which is a random string of characters.
        const hashedPassword = await bcrypt.hash(password, salt) //The argument 10 passed to genSalt() represents the number of rounds or the cost factor.

        //upload image to cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: "image" })
        const imageUrl = imageUpload.secure_url

        const doctorData = {
            name,
            email,
            image: imageUrl,
            password: hashedPassword,
            speciality,
            degree,
            experience,
            about,
            fees,
            address: JSON.parse(address),
            date: Date.now()
        }

        const newDoctor = new doctorModel(doctorData)
        await newDoctor.save()

        res.json({ success: true, message: "Doctor added" })


    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })

    }
}

//API for adminn login
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body
       
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {

            const token = jwt.sign(email + password, process.env.JWT_SECRET)
            res.json({ success: true, token })

        } else {
            res.json({ success: false, message: "Invalid credentials" })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

//API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.find({}).select('-password')
        res.json({ success: true, doctors })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })

    }
}

//API to get all appointments list
const appointmentsAdmin = async (req,res) =>{
    try {
        
        const appointments = await appointmentModel.find({})
        res.json({success:true,appointments})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//API to appointemnt cancellation

const appointmentCancel = async (req, res) => {
    try {

        const { appointmentId } = req.body

        const appointmentData = await appointmentModel.findById(appointmentId)

        await appointmentModel.findByIdAndUpdate(appointmentId, { cancelled: true })

        //releasing doctor slot

        const { docId, slotDate, slotTime } = appointmentData

        const doctorData = await doctorModel.findById(docId)

        let slots_booked = doctorData.slots_booked

        slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime)
        //If e !== slotTime → keep that element in the array.
        //If e === slotTime → remove it from the array.

        await doctorModel.findByIdAndUpdate(docId, { slots_booked })



        res.json({ success: true, message: 'Appointment Cancelled' })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

//API to get dashboard data for admin panel
const adminDashboard = async (req,res) =>{

    try {
      
       const doctors = await doctorModel.find({}) 
       const users  = await userModel.find({})
       const appointments = await appointmentModel.find({})

       const dashData = {
        doctors: doctors.length,
        appointments:appointments.length,
        patients:users.length,
        latestAppointments: appointments.reverse().slice(0,5)
       }

       res.json({success:true,dashData})

    } catch (error) {
         console.log(error);
        res.json({ success: false, message: error.message });
    }
}


export { addDoctor, loginAdmin ,allDoctors,appointmentsAdmin, appointmentCancel, adminDashboard}  