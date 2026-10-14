import {Router} from 'express';import Behavior from '../models/Behavior.js';import {optionalAuth,auth,AuthRequest} from '../middleware/auth.js';import {rebuildPreference} from '../services/preference.service.js';const r=Router();
r.post('/',optionalAuth,async(req:AuthRequest,res)=>{const event=await Behavior.create({...req.body,user:req.user?.id});if(req.user?.id)await rebuildPreference(req.user.id);res.status(201).json({ok:true,id:event._id})});
r.get('/preference',auth,async(req:AuthRequest,res)=>res.json(await rebuildPreference(req.user!.id)));export default r;
