# MIRA Vietnamese jewelry: synthetic starter

450 rows = 50 authored scenario families x 9 prefix variants; not 450 independent expert dialogues. Train 360 / validation 45 / test 45. Families do not cross splits; held-out families test different situations, not paraphrases of training questions. Templates are repetitive. Review and expand before reporting research or production quality. No customer data. No claim that test loss measures factual correctness.

Topics: small talk with retained context, clarification, materials, care, size, diamonds, grounded fictional catalogs, follow-ups, store policies and human support. Catalog values prefixed TEST and marked GIẢ LẬP are invented fixtures, never live product claims. Store policies and payment status remain unknown unless supplied.

Use UTF-8 JSONL messages. Metadata id/family/topic/synthetic must not enter the model prompt. Preserve the grouped split when extending the data. New real conversations require consent, de-identification and expert review.

Reference pages for human review (not copied training text):
- https://www.gia.edu/pearl-care-cleaning
- https://www.gia.edu/diamond-quality-factor
- https://trangsuc.doji.vn/blogs/blog/ni-nhan-la-gi
