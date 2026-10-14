import { Router } from 'express';
import Order from '../models/Order.js';
import { auth, admin, AuthRequest } from '../middleware/auth.js';
import { audit } from '../services/audit.service.js';

const r = Router();
const param = (value: string | string[]) => Array.isArray(value) ? value[0] : value;

r.post('/', auth, async (req: AuthRequest, res) => {
  const o = await Order.create({
    ...req.body,
    user: req.user!.id,
    paymentStatus: req.body.paymentMethod === 'BANK_QR' ? 'PENDING' : 'UNPAID',
    status: req.body.paymentMethod === 'BANK_QR' ? 'pending_payment' : 'pending'
  });
  res.status(201).json(o);
});

r.get('/mine', auth, async (req: AuthRequest, res) => {
  res.json(await Order.find({ user: req.user!.id }).sort({ createdAt: -1 }));
});

r.get('/', auth, admin, async (_req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

r.patch('/:id/status', auth, admin, async (req: AuthRequest, res) => {
  const id = param(req.params.id);
  const before = await Order.findById(id).lean();
  const after = await Order.findByIdAndUpdate(id, { status: req.body.status }, { new: true });
  await audit(req.user?.id, 'UPDATE_ORDER_STATUS', 'Order', id, before, after, req.ip);
  res.json(after);
});

export default r;
