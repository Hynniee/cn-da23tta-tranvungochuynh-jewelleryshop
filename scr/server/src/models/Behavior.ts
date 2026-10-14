import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',index:true},sessionId:String,type:{type:String,enum:['VIEW','SEARCH','CLICK','WISHLIST','ADD_CART','PURCHASE'],required:true,index:true},product:{type:mongoose.Schema.Types.ObjectId,ref:'Product'},query:String,metadata:{type:mongoose.Schema.Types.Mixed,default:{}}},{timestamps:true});
export default mongoose.model('Behavior',schema);
