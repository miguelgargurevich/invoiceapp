# 📝 Digital Signature Implementation Plan

## 🎯 Overview
Custom digital signature system for invoices and proposals compliant with ESIGN Act & UETA.

---

## 📊 SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                     SIGNATURE REQUEST FLOW                        │
└──────────────────────────────────────────────────────────────────┘

1. INITIATE REQUEST (Owner)
   ┌─────────────────────────────────────────────────┐
   │ Owner: Invoice/Proforma Detail Page             │
   │ → Click "Request Signature"                     │
   │ → Backend: POST /api/signatures/request         │
   │   • Generate secure token (UUID)                │
   │   • Create signature_request record             │
   │   • Send email with signing link                │
   └─────────────────────────────────────────────────┘

2. CLIENT SIGNS (Mobile/Tablet)
   ┌─────────────────────────────────────────────────┐
   │ Client: Opens /sign/{token}                     │
   │ → Validate token & expiration                   │
   │ → Show PDF preview                              │
   │ → Touch-based signature canvas                  │
   │ → Consent checkbox                              │
   │ → Submit: POST /api/signatures/submit           │
   │   • Upload signature PNG to Supabase Storage    │
   │   • Record metadata (IP, user agent, timestamp) │
   └─────────────────────────────────────────────────┘

3. PROCESS SIGNATURE (Backend)
   ┌─────────────────────────────────────────────────┐
   │ Backend: Signature Processing                   │
   │ → Validate token (one-time use)                 │
   │ → Store signature in DB                         │
   │ → Generate signed PDF with pdf-lib:             │
   │   • Embed signature image                       │
   │   • Add timestamp, signer info                  │
   │   • Add "Digitally signed" text                 │
   │ → Upload signed PDF to Supabase Storage         │
   │ → Mark request as completed                     │
   │ → Send confirmation emails                      │
   └─────────────────────────────────────────────────┘

4. DELIVERY & AUDIT
   ┌─────────────────────────────────────────────────┐
   │ • Email to client with signed PDF link          │
   │ • Email to owner with signed PDF link           │
   │ • Complete audit trail in DB                    │
   │ • Immutable signed PDF stored                   │
   └─────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA (Prisma)

### Add to `schema.prisma`:

```prisma
// 📝 Signature Requests
model SignatureRequest {
  id              String    @id @default(uuid())
  token           String    @unique // Secure single-use token
  documentType    String    @map("document_type") // 'INVOICE' or 'PROFORMA'
  documentId      String    @map("document_id") // ID of invoice or proforma
  signerEmail     String    @map("signer_email")
  signerName      String?   @map("signer_name")
  status          String    @default("PENDING") // PENDING, SIGNED, EXPIRED, CANCELLED
  expiresAt       DateTime  @map("expires_at")
  
  // Metadata
  requestedBy     String    @map("requested_by") // User ID who requested
  empresaId       String    @map("empresa_id")
  
  // Timestamps
  createdAt       DateTime  @default(now()) @map("created_at")
  sentAt          DateTime? @map("sent_at")
  viewedAt        DateTime? @map("viewed_at")
  
  // Relations
  empresa         Empresa   @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  signature       Signature?
  
  @@index([token])
  @@index([documentId])
  @@index([status])
  @@index([expiresAt])
  @@map("signature_requests")
}

// ✍️ Signatures
model Signature {
  id                    String    @id @default(uuid())
  signatureRequestId    String    @unique @map("signature_request_id")
  
  // Signature data
  signatureImageUrl     String    @map("signature_image_url") // Path in Supabase Storage
  signedPdfUrl          String?   @map("signed_pdf_url") // Final signed PDF
  
  // Signer information
  signerName            String    @map("signer_name")
  signerEmail           String    @map("signer_email")
  signedAt              DateTime  @default(now()) @map("signed_at")
  
  // Legal compliance
  consentGiven          Boolean   @default(true) @map("consent_given")
  consentText           String?   @map("consent_text")
  
  // Audit metadata
  ipAddress             String?   @map("ip_address")
  userAgent             String?   @map("user_agent")
  deviceType            String?   @map("device_type") // 'mobile', 'tablet', 'desktop'
  
  // Timestamps
  createdAt             DateTime  @default(now()) @map("created_at")
  
  // Relations
  signatureRequest      SignatureRequest @relation(fields: [signatureRequestId], references: [id], onDelete: Cascade)
  
  @@index([signatureRequestId])
  @@map("signatures")
}

// 📄 Update existing models to add relation
model Factura {
  // ... existing fields ...
  
  // Add to existing relations:
  signatureRequests SignatureRequest[]
}

model Proforma {
  // ... existing fields ...
  
  // Add to existing relations:
  signatureRequests SignatureRequest[]
}
```

---

## 🔌 API ENDPOINTS

### Backend Routes (`apps/backend/src/routes/signatures.js`)

```javascript
// POST /api/signatures/request
// Create signature request and send email
Request:
{
  "documentType": "INVOICE" | "PROFORMA",
  "documentId": "uuid",
  "signerEmail": "client@example.com",
  "signerName": "John Doe",
  "expiresInDays": 7
}

Response:
{
  "success": true,
  "signatureRequest": {
    "id": "uuid",
    "token": "secure-token",
    "expiresAt": "2025-01-03T00:00:00.000Z",
    "signingUrl": "https://app.com/sign/secure-token"
  }
}

// GET /api/signatures/validate/:token
// Validate token and get document info
Response:
{
  "valid": true,
  "signatureRequest": {
    "id": "uuid",
    "documentType": "INVOICE",
    "signerEmail": "client@example.com",
    "expiresAt": "2025-01-03T00:00:00.000Z"
  },
  "document": { /* invoice or proforma data */ }
}

// POST /api/signatures/submit
// Submit signature and process
Request:
{
  "token": "secure-token",
  "signature": "base64-png-data",
  "signerName": "John Doe",
  "consentGiven": true,
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "deviceType": "mobile"
  }
}

Response:
{
  "success": true,
  "signature": {
    "id": "uuid",
    "signedPdfUrl": "https://storage.supabase.co/...",
    "signedAt": "2025-12-27T10:30:00.000Z"
  }
}

// GET /api/signatures/status/:token
// Check signature status
Response:
{
  "status": "PENDING" | "SIGNED" | "EXPIRED",
  "signedAt": "2025-12-27T10:30:00.000Z",
  "signedPdfUrl": "https://..."
}
```

---

## 🎨 FRONTEND COMPONENTS

### 1. Request Signature Button (Invoice/Proforma Detail Pages)

```tsx
// Component: RequestSignatureButton.tsx
<Button 
  onClick={handleRequestSignature}
  disabled={hasActiveSigRequest}
>
  <FileSignature className="w-4 h-4 mr-2" />
  Request Signature
</Button>
```

### 2. Signing Page (`/sign/[token]/page.tsx`)

```tsx
// Mobile-first signing page
- Token validation
- PDF preview (iframe or canvas)
- Signature canvas (signature_pad library)
- Consent checkbox
- Clear & re-sign buttons
- Submit action
```

### 3. Signature Canvas Component

```tsx
// Component: SignatureCanvas.tsx
- Uses signature_pad library
- Touch-friendly
- Clear/redo functionality
- Export as PNG
- Responsive sizing
```

---

## 📦 DEPENDENCIES TO INSTALL

### Frontend
```bash
cd apps/frontend
npm install signature_pad react-signature-canvas
```

### Backend
```bash
cd apps/backend
npm install pdf-lib uuid
```

---

## 🔐 SECURITY CONSIDERATIONS

1. **Token Security**
   - Use crypto.randomUUID() or uuid v4
   - Single-use tokens (mark as used after signature)
   - Expiration validation (default 7 days)
   - Rate limiting on validation endpoint

2. **Data Protection**
   - HTTPS only
   - No sensitive data in URLs
   - Secure file storage (Supabase RLS policies)
   - Audit trail with IP and user agent

3. **Legal Compliance (ESIGN Act / UETA)**
   - ✅ Explicit consent checkbox
   - ✅ Intent to sign demonstrated
   - ✅ Audit trail preserved
   - ✅ Electronic record retention
   - ✅ Association with document

---

## 📱 UX BEST PRACTICES

### Mobile Signing Experience
1. **Responsive canvas** - Full width on mobile
2. **Clear instructions** - "Sign with your finger"
3. **Undo/Clear** - Easy mistake correction
4. **Preview before submit** - Show signature preview
5. **Large touch targets** - Buttons min 44x44px
6. **Portrait orientation** - Lock or optimize for
7. **Loading states** - Show processing feedback

### Desktop Fallback
- Allow mouse signing
- Show instructions for trackpad/mouse
- Suggest using mobile for better experience

---

## 🚀 IMPLEMENTATION STEPS

### Phase 1: Database & Backend (2-3 days)
1. ✅ Add Prisma schema models
2. ✅ Run migration: `npx prisma migrate dev --name add_signature_system`
3. ✅ Create `/api/signatures` routes
4. ✅ Implement token generation
5. ✅ Implement email sending
6. ✅ Test endpoints with Postman

### Phase 2: Signing Page (2-3 days)
1. ✅ Install signature_pad
2. ✅ Create `/sign/[token]` page
3. ✅ Implement signature canvas
4. ✅ Add PDF preview
5. ✅ Mobile optimization
6. ✅ Form validation

### Phase 3: PDF Processing (2-3 days)
1. ✅ Install pdf-lib
2. ✅ Implement PDF stamping logic
3. ✅ Add signature image to PDF
4. ✅ Add metadata text
5. ✅ Upload to Supabase Storage
6. ✅ Test signed PDF generation

### Phase 4: Integration (1-2 days)
1. ✅ Add "Request Signature" button to Invoice detail
2. ✅ Add "Request Signature" button to Proforma detail
3. ✅ Show signature status in UI
4. ✅ Display signed PDF download link
5. ✅ Email notifications

### Phase 5: Testing & Polish (1-2 days)
1. ✅ Test full flow on mobile
2. ✅ Test on iPad
3. ✅ Edge case handling
4. ✅ Error messages
5. ✅ Security audit

**Total Estimate: 8-12 days**

---

## 🔮 FUTURE ENHANCEMENTS

- [ ] Multi-party signatures (client + contractor)
- [ ] SMS notification option
- [ ] Signature templates (save & reuse)
- [ ] Signature verification QR code
- [ ] Certificate of completion PDF
- [ ] Webhook notifications
- [ ] Signature analytics dashboard

---

## ✅ SUCCESS CRITERIA

- ✅ Client can sign from iPhone/iPad
- ✅ No paper required
- ✅ Signed PDF legally defensible
- ✅ Complete audit trail
- ✅ Secure & scalable
- ✅ Fast UX (<30 seconds to sign)
- ✅ Works offline (signature canvas)
- ✅ Email notifications sent

---

## 📚 LEGAL COMPLIANCE CHECKLIST

### ESIGN Act Requirements
- ✅ **Intent to sign**: Explicit "Sign Document" button
- ✅ **Consent**: Checkbox "I agree to sign electronically"
- ✅ **Association**: Signature linked to specific document
- ✅ **Record retention**: Audit trail stored permanently
- ✅ **Accuracy**: Original PDF + signature preserved

### UETA Requirements
- ✅ **Electronic record**: Signature stored as image
- ✅ **Integrity**: Signed PDF immutable
- ✅ **Attributable**: IP, timestamp, device type
- ✅ **Retention**: Stored in Supabase (long-term)

**Note**: This is NOT a Certificate Authority. No cryptographic signatures.
This is an electronic signature capture system for business documents.

---

## 📖 REFERENCES

- [ESIGN Act (US)](https://www.fdic.gov/regulations/compliance/manual/10/x-3.1.pdf)
- [UETA](https://www.uniformlaws.org/committees/community-home?CommunityKey=2c04b76c-2b7d-4399-977e-d5876ba7e034)
- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [signature_pad](https://github.com/szimek/signature_pad)

---

**Created**: 2025-12-27
**Last Updated**: 2025-12-27
**Status**: Ready for Implementation
