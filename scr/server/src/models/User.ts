import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true},email:{type:String,required:true,unique:true,lowercase:true},password:{type:String,required:true},role:{type:String,enum:['customer','staff','product_manager','manager','admin'],default:'customer'}},{timestamps:true});
export default mongoose.model('User',schema);
