import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},message:String,intent:{type:mongoose.Schema.Types.Mixed,default:{}},answer:String,recommendedProducts:[{type:mongoose.Schema.Types.ObjectId,ref:'Product'}],latencyMs:Number},{timestamps:true});
export default mongoose.model('AIConversation',schema);
