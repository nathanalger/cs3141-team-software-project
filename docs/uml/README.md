# Email UML diagrams

These diagrams describe the current email-related code, with the focus kept on
receiving, sending, and rendering. The inbox currently displays generated
sample messages. The IMAP and SMTP functions are standalone examples: mailbox
listing does not fetch email content, and sending is not connected to a compose
screen or inbox action.

## Use case

Diagram: [email-use-case.puml](./email-use-case.puml)

**Formal description**

- **System boundary:** the current Email Client implementation.
- **Actors:** `User` views the inbox; `API Caller` invokes the standalone
  mailbox-listing and test-send functions; IMAP and SMTP servers support those
  sample API operations.
- **Use cases:** viewing sample inbox messages, listing remote mailbox names,
  and sending a test email.
- **Constraints:** viewing the inbox reads generated data rather than an IMAP
  server. Listing mailboxes returns mailbox paths, not messages. The test send
  uses configured SMTP settings and is not exposed through the current UI.

## Class

Diagram: [email-class.puml](./email-class.puml)

**Formal description**

- `EmailAddress` represents an address and optional display name.
- `EmailMessage` contains message identity, participants, content, date, and
  thread references.
- `StoredEmail` wraps one `EmailMessage` with mailbox and storage metadata.
- `OutgoingEmail` wraps an `EmailMessage` and may contain an SMTP envelope.
- `InboxPage` obtains a collection of `StoredEmail` values from the sample
  generator and supplies them to `EmailGrid`; the grid displays each message's
  subject and text.
- The sample `sendEmail()` API currently constructs its SMTP message directly;
  it does not accept an `OutgoingEmail`.

## Sequence

Diagram: [email-sequence.puml](./email-sequence.puml)

**Formal description**

1. The user opens the inbox.
2. `InboxPage` requests generated sample messages and passes the resulting
   `StoredEmail[]` to `EmailGrid`.
3. `EmailGrid` renders each message's subject and text to the user.
4. Separately, an API caller may invoke `listMailboxes()`. It connects to the
   IMAP server, obtains mailbox paths, then logs them; it does not retrieve
   message bodies.
5. Separately, an API caller may invoke `sendEmail()`. It sends a configured
   test message through SMTP and logs the returned message ID.

The final two interactions are standalone sample operations, not steps in the
inbox rendering flow.
