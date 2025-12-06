# Product Requirements Document: DridCon Ticket Management System

## 1. Overview

The DridCon Ticket Management System is designed to streamline the attendee verification process for the DridCon conference. The system will handle attendee registration, QR code generation, and on-site verification.

## 2. User Roles

- **Admin:** The superuser of the system. The Admin is responsible for managing agents (Front Desk) and attendees. They can add, invite, and manage all users.
- **Front Desk (Agent):** These are the individuals responsible for verifying attendees at the conference venue. They will have access to a mobile application or web interface to scan QR codes.
- **Attendee (User):** These are the conference attendees. They will receive a unique QR code via email after their registration is complete and payment is confirmed.

## 3. User Flow

### 3.1. Attendee Flow

#### 3.1.1. Scenario 1: Manual Registration by Admin

1.  The Admin manually collects the attendee's information (Full Name, Email, Phone Number, Ticket Type, Designation, Department).
2.  The Admin creates a new attendee record in the admin dashboard.
3.  The system generates a unique QR code for the attendee.
4.  The system sends an email to the attendee containing their ticket information and the unique QR code.
5.  On the day of the conference, the attendee presents their QR code (on their phone or a printout) to the Front Desk agent.
6.  The Front Desk agent scans the QR code.
7.  The system validates the QR code.
8.  If the QR code is valid, the system marks the attendee as "checked-in," and the attendee is granted entry. The QR code is now considered "used" and cannot be used for another entry.
9.  If the QR code is invalid or has already been used, the system will display an error message to the Front Desk agent, including details of who checked in the attendee if the ticket has already been used.

#### 3.1.2. Scenario 2: Self-Registration by Attendee ✅ (complete in frontend)

1.  The attendee visits the DridCon conference website and navigates to the registration page.
2.  The attendee fills out a registration form with their information (Full Name, Email, Phone Number, and preferred Ticket Type: Student Pass, Researcher Standard, or Researcher Premium).
3.  The website displays the bank account details for payment.
4.  The attendee makes the payment and uploads a proof of payment (receipt).
5.  The attendee's information appears in the admin dashboard with a "payment pending" status.
6.  The Admin verifies the payment.
7.  Once the payment is confirmed, the Admin approves the registration.
8.  The system generates a unique QR code for the attendee.
9.  The system sends an email to the attendee containing their ticket information and the unique QR code.
10. On the day of the conference, the attendee presents their QR code to the Front Desk agent for scanning (following steps 5-9 in Scenario 1).

#### 3.1.3. Scenario 3: Partial Registration by Admin & Completion by Attendee ✅ (complete in frontend)

1.  The Admin has partial information for an attendee (e.g., only email address).
2.  The Admin uses the "Invite user" function in the admin dashboard, inputting the available partial information and selecting the intended Ticket Type if known.
3.  The system sends an email to the attendee with a unique registration link. This link pre-fills any information the Admin already provided.
4.  The attendee clicks the link and is directed to a registration page.
5.  On the registration page, the attendee sees the pre-filled fields (e.g., email) and completes the remaining required information (Full Name, Phone Number, and potentially updates/confirms Ticket Type, Designation).
6.  The attendee submits the completed form.
7.  The system generates a unique QR code for the attendee.
8.  The system sends an email to the attendee containing their ticket information and the unique QR code.
9.  On the day of the conference, the attendee presents their QR code to the Front Desk agent for scanning (following steps 5-9 in Scenario 1).

### 3.2. Front Desk (Agent) Flow

1.  **Agent Login:** The Front Desk agent logs into the system using their provided credentials (received via email from the Admin). ✅ (complete in frontend)
2.  **Attendee QR Code Presentation:** The agent requests the attendee to present their unique QR code (either on a mobile device or printed).
3.  **QR Code Scan:** The agent uses a scanning device (e.g., a mobile web application after logging into the system) to scan the attendee's QR code. ✅ (complete in frontend — UI implemented)
4.  **System Validation & Feedback:** ✅ (complete in frontend — UI implemented)
    - **Valid QR Code (First Scan):**
      - The system validates the QR code.
      - If valid and not previously scanned, the system marks the attendee as "checked-in" and invalidates that specific QR code for future use.
      - The system displays a "Successful Entry" confirmation to the agent.
      - The agent grants entry to the attendee.
    - **Invalid QR Code:**
      - The system displays an "Invalid QR Code" error message to the agent.
      - The agent denies entry and escalates the issue if necessary.
    - **Already Scanned QR Code:**
      - The system displays a message indicating the QR code has already been used.
      - The message includes details such as "Already Checked-In by [Agent Name] at [Time/Date]".
      - The agent denies entry and escalates the issue if necessary.
5.  **Scan History:** The agent can view a history of users they have scanned, including their check-in status. ✅ (complete in frontend — UI implemented)

### 3.3. Admin Flow

1.  **Admin Login:** The Admin logs into the system with their credentials. (complete in frontend)
2.  **Agent Management:** (complete in frontend — UI and credential generation simulated on frontend)
  - **Add New Agent:** The Admin can add new Front Desk agents by inputting their Full Name and Email. (implemented in frontend)
  - **Generate Credentials:** The system generates unique login credentials for the new agent. (generated client-side and shown to admin)
  - **Send Credentials:** The system sends an email to the new agent containing their login credentials. (UI displays simulated send; actual email delivery is backend responsibility)
3.  **Attendee Management:** ✅ (complete in frontend — UI implemented)
    - **Add Attendee (Manual Registration - Scenario 3.1.1):**
      - The Admin can manually input all attendee details (Full Name, Email, Phone Number, Ticket Type, Designation).
      - The system generates a QR code and sends the ticket email to the attendee.
    - **Invite Attendee (Partial Registration - Scenario 3.1.3):**
      - The Admin can initiate a partial registration by inputting available attendee details (minimum email).
      - The system sends an invitation email with a unique link for the attendee to complete their registration.
    - **Review Self-Registered Attendees (Scenario 3.1.2):**
      - The Admin views a list of attendees who have self-registered and are awaiting payment verification.
      - For each pending attendee, the Admin reviews the uploaded proof of payment.
      - **Approve Registration:** If payment is verified, the Admin approves the registration. The system then generates a QR code and sends the ticket email to the attendee.
      - **Decline Registration:** If payment is not verified, the Admin can decline the registration (and optionally notify the user).
    - **View All Attendees:** The Admin can view a comprehensive list of all attendees, including their registration status, payment status, and check-in status.
4.  **Reporting and Tracking:**
    - **Monitor Check-ins:** The Admin can view real-time check-in status of all attendees, seeing which QR codes have been scanned and by which agent.
    - **Generate Reports:** The Admin can generate reports related to attendance, agent activity, and registration trends.

## 4. Functional Requirements

#### 4.1. General System Requirements

- The system shall generate unique QR codes for each approved attendee.
- The system shall send email notifications to attendees (with QR codes) and agents (with credentials).
- The system shall ensure QR codes are invalidated after a single successful scan to prevent re-entry.
- The system shall record who checked in an attendee.

#### 4.2. Attendee-Specific Requirements

- The system shall allow attendees to self-register via a web form, providing personal details, ticket type, and proof of payment.
- The system shall allow attendees to complete partial registrations initiated by an Admin.
- The system shall display bank account details for payment during self-registration.
- The system shall allow attendees to upload a receipt/proof of payment.
- The system shall enable attendees to present their QR code for scanning at entry.

#### 4.3. Front Desk (Agent)-Specific Requirements

- The system shall allow agents to log in securely with unique credentials.
- The system shall provide an interface for agents to scan attendee QR codes.
- The system shall display immediate feedback upon QR code scan (valid, invalid, already scanned).
- The system shall, for already scanned QR codes, display the name of the agent who performed the initial scan.
- The system shall maintain a history of scans performed by each agent.

#### 4.4. Admin-Specific Requirements

- The system shall allow the Admin to securely log in.
- The system shall allow the Admin to add new agents (Full Name, Email).
- The system shall allow the Admin to manually add full attendee details (Full Name, Email, Phone Number, Ticket Type, Designation) and trigger QR code generation/email.
- The system shall allow the Admin to initiate partial attendee registrations by sending an invitation link.
- The system shall allow the Admin to review self-registered attendees, including their submitted details and proof of payment.
- The system shall allow the Admin to approve or decline self-registrations.
- The system shall provide the Admin with a comprehensive view of all attendees (registration status, payment status, check-in status).
- The system shall enable the Admin to monitor real-time check-in status and identify who scanned which QR code.
- The system shall enable the Admin to generate reports (attendance, agent activity, registration trends).

## 5. Non-Functional Requirements

#### 5.1. Performance

- The QR code scanning and validation process shall provide a response within 2 seconds to ensure efficient attendee throughput.
- The system shall be capable of handling 20 concurrent agent logins and 100 concurrent QR code scans without degradation in performance.
- Admin dashboard operations (e.g., loading attendee lists, generating reports) shall be responsive, with typical actions completing within 5 seconds.

#### 5.2. Security

- All user (Admin, Agent, Attendee) data, especially personally identifiable information (PII) and payment details, shall be encrypted both in transit and at rest.
- User authentication for Admin and Agent roles shall be secure (e.g., using strong password policies, multi-factor authentication where appropriate).
- The system shall protect against common web vulnerabilities (e.g., SQL injection, XSS).
- Access to administrative functions shall be restricted based on role-based access control.
- QR codes shall be designed to be resistant to unauthorized reproduction or tampering.

#### 5.3. Usability (UX)

- The agent scanning interface shall be intuitive and easy to use, requiring minimal training.
- Error messages and feedback shall be clear and actionable for both agents and attendees.
- The attendee registration process (especially self-registration) shall be user-friendly and guided.
- The Admin dashboard shall provide a clear overview and efficient tools for managing agents and attendees.

#### 5.4. Reliability and Availability

- The system shall have an uptime of at least 99.5% during the conference period.
- Data backups shall be performed regularly to prevent data loss.
- The system shall have mechanisms for error logging and monitoring to facilitate quick issue resolution.

#### 5.5. Scalability

- The system architecture shall be designed to scale to accommodate a growing number of attendees and agents for future conferences.

#### 5.6. Maintainability

- The codebase shall be well-documented, modular, and follow established coding standards to facilitate future enhancements and maintenance.

#### 5.7. Compliance

- The system shall comply with relevant data privacy regulations (e.g., GDPR, CCPA) regarding the collection, storage, and processing of attendee data.
