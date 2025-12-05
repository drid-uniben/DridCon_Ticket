# DridCon Ticket Management System - Backend Refactoring Plan

This document outlines the steps to refactor the existing backend codebase to align with the requirements specified in `prd.md`.

## 1. Data Model Refactoring

The existing data models are not suitable for this project. We need to adjust them to fit the needs of the DridCon Ticket Management System.

-   **Modify `server/src/model/user.model.ts`**:
    -   Remove the `wallet` and `agentProfile` fields from the `IUser` interface and `UserSchema`.
    -   Add the following new fields to the `IUser` interface and `UserSchema`:
        -   `phoneNumber`: `String`
        -   `ticketType`: `String` (with enum: `Student Pass`, `Researcher Standard`, `Researcher Premium`)
        -   `designation`: `String`
        -   `qrCode`: `String` (to store the QR code data)
        -   `paymentStatus`: `String` (with enum: `pending`, `confirmed`, `declined`)
        -   `paymentProof`: `String` (to store the path to the uploaded payment proof)
        -   `checkInStatus`: `String` (with enum: `not-checked-in`, `checked-in`)
        -   `checkedInAt`: `Date`
        -   `checkedInBy`: `mongoose.Schema.Types.ObjectId` (ref: 'User')
-   **Delete `server/src/model/transaction.model.ts`**: This model is not needed.
-   **Delete `server/src/model/withdrawal.model.ts`**: This model is not needed.

## 2. API Route and Controller Refactoring

We will restructure the API endpoints and business logic to match the user flows in the PRD.

-   **Delete `server/src/routes/redeem.ts`**: This route is irrelevant.
-   **Update `server/src/routes/index.ts`**:
    -   Remove the `redeem` route.
-   **Refactor `auth` module**:
    -   **`server/src/controllers/auth.controller.ts`**:
        -   Modify the `register` function to handle attendee self-registration, including saving the `paymentProof`.
        -   Create a new function `createAgent` to be used by the admin to create new agents. The function should generate a random password for the agent and send it via email.
    -   **`server/src/routes/auth.routes.ts`**:
        -   Update routes to point to the new controller functions.
-   **Refactor `admin` module**:
    -   **`server/src/controllers/admin.controller.ts`**:
        -   Implement `createAgent` (called from `auth.controller.ts`).
        -   Implement `manualRegisterAttendee`.
        -   Implement `inviteAttendee`.
        -   Implement `reviewSelfRegisteredAttendees`.
        -   Implement `approveRegistration`.
        -   Implement `declineRegistration`.
        -   Implement `getAllAttendees`.
        -   Implement `getDashboardData` (for reports and monitoring).
    -   **`server/src/routes/admin.routes.ts`**:
        -   Create routes for all the admin controller functions.
-   **Refactor `user` module (for attendees)**:
    -   **`server/src/controllers/user.controller.ts`**:
        -   Implement `getMyTicket` to allow an attendee to view their ticket and QR code.
        -   Implement `completePartialRegistration`.
    -   **`server/src/routes/user.ts`**:
        -   Create routes for the user controller functions.
-   **Refactor `scan` module**:
    -   **`server/src/controllers/scan.controller.ts`**:
        -   Implement `scanQRCode`. This is a critical function. It needs to:
            1.  Validate the QR code.
            2.  Check if the attendee is already checked in.
            3.  If not checked in, mark as `checked-in`, set `checkedInAt` and `checkedInBy`.
            4.  Return appropriate success or error messages.
    -   **`server/src/routes/scan.ts`**:
        -   Create a route for `scanQRCode`.

## 3. Service Layer Implementation

We will create and modify services to handle specific tasks.

-   **Create `server/src/services/qr.service.ts`**:
    -   Implement a function `generateQRCode` that takes user data and generates a unique QR code.
-   **Implement `server/src/services/email.service.ts`**:
    -   Implement a function to send the QR code ticket to attendees.
    -   Implement a function to send credentials to new agents.
-   **Update `server/src/services/user.service.ts`**:
    -   Update the user service to align with the new user model and registration flows.

## 4. Middleware

-   **Update `server/src/middleware/auth.middleware.ts`**:
    -   Ensure the middleware can differentiate between `Admin`, `Agent`, and `User` roles and protect routes accordingly.

## 5. Environment Variables

-   **Update `server/.env.example`**:
    -   Add any new environment variables needed (e.g., for email service, JWT secrets if not already present).
