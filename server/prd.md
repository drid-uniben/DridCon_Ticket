Product Requirements Document: Ticket management system

1. Overview

The goal is to create a system that sends a unique QR code to users upon email address with their payment plan for verification on the day of the conference. User's will be given special QR codes which they are to show upon entry to the conference. The agents which will be called frontdesks, will have a system in which they scan user's QR code to verify them before allowing entry. The admin will apoint the frontdesks in the admin dashboard, the frontdesks will recieve their credentials in their email which will be used to login to the system. The frontdesks will be able to scan QR codes and have an history of users they have scanned. Any QR code that is scanned and was not appointed by the system will be invalid. The admin will send the emails containing the users payment informations and QR code on the dashboard, and will be able to see which QR code has been on the day of the conference.

2. Requirements

i. User's information
a. Full Name
b. Email
c. Phone Number
d. Ticket payed for
e. Deisgnation- the title/position of the person attending (optional field)

ii. Agent's information
a. Full Name
b. Email

3. System flow

i. Admin flow:
a. Inputing frontdesks information
b. Send an email to the frontdesks with credentials.
c. Input user's information.
d. Send an email to the user containing they payment plan already paid for and QR code
e. Track who has had their QR code scanned

ii. Frontdesks flow:
a. Login to the system
b. Ask for QR code from attenders
c. Scan QR code with device on the system
d. Let attender in if scan was successful, system marks attender as present and makes the QR code invalid, but scanning an previously scanned qr code shows more info saying that you have already been checked in and then shows the name of agent that checked you in too.

iii. Users flow:
a. Get email from the admin containing information and QR code
b. On the day of the conference, shows QR code to the frontdesks
c. Frontdesks scans QR code and it is successful, gains entry into the auditorium

Then for future implementation, instead of the admin just inputting all the information himself in the admin dashboard to register a user, he should be able to fill in some of the information/fields with only the email being required then he sends the user a register link and when the user receives the email he clicks on the link he gets taken to a page where he'll see the email fields already pre-filled same with any other field that the admin already filled before semding the invite and then the user can then fill in the remaining fields and then submit using the register button and then they get the email containing info and their qr code to accesss the event. The admin will have a "Add user" and "Invite user" button, the invite user will be sent to users whom the admin deosn't have their complete information so the users can fill in the remaining fields themselves. While the "Add user" will be for users that their designations are already available

This should be the flow I think, right now I want the ticket system to handle everything that needs to be handled. From the form to be submitted in the frontend that'll contain the name, email, phone number, preferred ticket type, it's a selection out of three possible types, the student pass, researcher standard and the researcher premium, then it shows the bank account for you to pay into then below it is the space for you to then upload your receipt, and then your info is then shown in the site and the admin can then see it in his dashboard and when the admin confirms your payment then he can approve you and then you recieve the email containing your ticket, also the rest of the prd above was for for it to handle a scenario where this ticket system wasn't used from the begining and then they have to migrate the info of the people they already have and the admin has to manually input the information of those people and then send them the email containing their ticket or then for situations where he doesn't have all their information then he has to then input partial information and send the users a link to take them to a form field where they can then input the remaining details.
