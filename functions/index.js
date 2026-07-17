const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Helper: Send an FCM push notification to a single user by their stored token.
 * Gracefully fails if user has no token.
 */
async function sendPush(uid, title, body) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const token = userDoc.data()?.fcmToken;
    if (!token) return; // User hasn't granted push permission yet

    await messaging.send({
      token,
      notification: { title, body },
      webpush: {
        notification: {
          title,
          body,
          icon: 'https://thelandlordproperty.com/logo_mark.png',
          badge: 'https://thelandlordproperty.com/logo_mark.png',
        },
        fcmOptions: { link: 'https://thelandlordproperty.com/dashboard' },
      },
    });
    console.log(`[FCM Push] Sent push to uid: ${uid}`);
  } catch (err) {
    console.warn('[FCM Push] Push delivery failed (non-critical):', err.message);
  }
}

/**
 * 1. onUserCreated (Auth Trigger)
 * Fires when a new user registers via Firebase Auth.
 * Automatically provisions their profile document in Firestore,
 * dispatches welcome notifications, and logs the activity.
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email || "";
  const displayName = user.displayName || "";
  const phoneNumber = user.phoneNumber || "";

  let role = "buyer";
  const searchString = (email + " " + displayName).toLowerCase();
  if (searchString.includes("admin")) {
    role = "admin";
  } else if (searchString.includes("seller") && searchString.includes("distress")) {
    role = "distress_seller";
  } else if (searchString.includes("seller")) {
    role = "seller";
  } else if (searchString.includes("owner")) {
    role = "shortlet_owner";
  } else if (searchString.includes("guest")) {
    role = "shortlet_guest";
  }

  const name = displayName || email.split("@")[0] || "User";

  // 2. Create the Firestore User profile document
  const userRef = db.collection("users").doc(uid);
  const userProfile = {
    name: name,
    email: email,
    phone: phoneNumber,
    role: role,
    buyer: role === "buyer",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    verified: false,
    preferences: {
      budget: 150000000,
      preferredDistricts: ["Jabi", "Guzape"],
      waAlerts: true
    }
  };

  await userRef.set(userProfile);
  console.log(`[onUserCreated] Created user profile in Firestore for uid: ${uid}, role: ${role}`);

  // 3. Select notifications templates based on role
  const notificationsToSend = [];

  if (role === "buyer") {
    // Welcome Email
    notificationsToSend.push({
      type: "email",
      title: "🏡 Welcome to The Landlord Property AI",
      message: `Hello ${name},

Welcome to The Landlord Property AI.

Your Buyer Account has been created successfully.

You can now:
✔ Buy Verified Property
✔ Explore Distress Deals
✔ View AI Property Reports
✔ Save Favourite Listings
✔ Request Property Inspection

Dashboard
https://thelandlordproperty.com/dashboard

Find.
Verify.
Buy.
Sell.
Stay.
Manage.

RC:1572092
Since 2019`
    });

    // Welcome SMS
    notificationsToSend.push({
      type: "sms",
      title: "Welcome " + name,
      message: `Welcome ${name}.

Your account is now active.

Login to discover verified properties.

The Landlord Property AI
thelandlordproperty.com`
    });

    // Welcome WhatsApp
    notificationsToSend.push({
      type: "whatsapp",
      title: "🏡 Welcome to The Landlord Property AI",
      message: `🏡 Welcome to The Landlord Property AI

Hello ${name},

Your Buyer Account is ready.

You now have access to:
🏠 Verified Properties
⚡ Distress Deals
🤖 AI Property Advisor
🔒 Verified Documents

Login
https://thelandlordproperty.com/dashboard

Need help?
Reply here anytime.`
    });
  } else if (role === "seller") {
    notificationsToSend.push({
      type: "email",
      title: "Welcome Sarah",
      message: `Welcome ${name}

Your Seller Dashboard is ready.

AI can now:
- Estimate Property Value
- Find Buyers
- Generate Agreements
- Verify Documents
- Manage Offers

Start Listing
Dashboard
thelandlordproperty.com`
    });
  } else if (role === "shortlet_guest") {
    notificationsToSend.push({
      type: "whatsapp",
      title: "Welcome Guest",
      message: `Welcome ${name}

Book premium verified apartments.

Enjoy
- AI Concierge
- Easy Check-in
- Verified Hosts
- 24/7 Support

Dashboard
thelandlordproperty.com`
    });
  } else if (role === "shortlet_owner") {
    notificationsToSend.push({
      type: "whatsapp",
      title: "Welcome Host",
      message: `Welcome Host

Manage your property smarter.

AI Features
- Dynamic Pricing
- Guest Screening
- Cleaning Schedule
- Revenue Forecast
- Maintenance Alerts

Dashboard
thelandlordproperty.com`
    });
  } else if (role === "distress_seller") {
    notificationsToSend.push({
      type: "sms",
      title: "Priority Sale Activated",
      message: `Priority Sale Activated

AI is now matching verified buyers.

Estimated Sale Window: 14 Days

View Dashboard
thelandlordproperty.com`
    });
  }

  // 4. Save Notification documents to history
  const batch = db.batch();
  notificationsToSend.forEach((notif) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId: uid,
      type: notif.type,
      email: email,
      status: "sent",
      sent: true,
      title: notif.title,
      message: notif.message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // 5. Create Activity Log
  const logRef = db.collection("activity_logs").doc();
  batch.set(logRef, {
    userId: uid,
    action: "account_created",
    details: `Profile created with role ${role}. Sent ${notificationsToSend.length} welcome notifications.`,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();

  // 6. Send FCM push for welcome notification
  await sendPush(uid, '🏡 Welcome to The Landlord Property!', `Hello ${name}, your account is ready. Explore verified distress deals now.`);

  console.log(`[onUserCreated] Sent ${notificationsToSend.length} notifications & logged activity for uid: ${uid}`);
});

/**
 * 2. onUserUpdated (Firestore Trigger - Login Detection)
 * Monitors changes to the user document and triggers a "Welcome back"
 * notification when lastLogin is updated.
 */
exports.onUserUpdated = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if lastLogin timestamp has changed
    const beforeLogin = beforeData.lastLogin ? beforeData.lastLogin.toMillis() : 0;
    const afterLogin = afterData.lastLogin ? afterData.lastLogin.toMillis() : 0;

    if (afterLogin > beforeLogin) {
      const name = afterData.name || "Client";
      const uid = context.params.userId;
      const email = afterData.email || "";

      console.log(`[onUserUpdated] Login detected for user: ${name} (${uid})`);

      const notifRef = db.collection("notifications").doc();
      const welcomeBackNotif = {
        userId: uid,
        type: "whatsapp",
        email: email,
        status: "sent",
        sent: true,
        title: `Welcome back ${name}`,
        message: `Welcome back ${name}

15 new verified properties match your interests.

View now: thelandlordproperty.com`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const logRef = db.collection("activity_logs").doc();
      const activityLog = {
        userId: uid,
        action: "user_logged_in",
        details: "Detected login. Dispatched welcome back notification.",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const batch = db.batch();
      batch.set(notifRef, welcomeBackNotif);
      batch.set(logRef, activityLog);
      await batch.commit();

      // Send FCM push for welcome-back
      await sendPush(uid, `Welcome back, ${name}! 👋`, '15 new verified properties match your interests. View now.');

      console.log(`[onUserUpdated] Dispatched welcome back notification for uid: ${uid}`);
    }
  });

/**
 * 3. onPropertyCreated (Firestore Trigger - AI Property Match)
 * Triggers when a new property is published to the `properties` collection.
 * Matches the property against buyer preferences and notifies them.
 */
exports.onPropertyCreated = functions.firestore
  .document("properties/{propertyId}")
  .onCreate(async (snapshot, context) => {
    const property = snapshot.data();
    const propertyId = context.params.propertyId;

    const district = property.district;
    const price = property.askingPrice || property.nightlyRate || 0;
    const title = property.title || "New Property";

    console.log(`[onPropertyCreated] Checking matches for new property: "${title}" in ${district} for ₦${price.toLocaleString()}`);

    // Query all buyers
    const buyersSnapshot = await db
      .collection("users")
      .where("role", "==", "buyer")
      .get();

    if (buyersSnapshot.empty) {
      console.log("[onPropertyCreated] No buyers registered to match against.");
      return;
    }

    const batch = db.batch();
    let matchCount = 0;

    buyersSnapshot.forEach((buyerDoc) => {
      const buyer = buyerDoc.data();
      const buyerId = buyerDoc.id;
      const preferences = buyer.preferences;

      if (!preferences) return;

      // Match criteria:
      // - Property district is in buyer's preferred districts
      // - Property asking price is within buyer's budget
      const districtMatch = preferences.preferredDistricts && preferences.preferredDistricts.includes(district);
      const budgetMatch = price <= (preferences.budget || Infinity);

      if (districtMatch && budgetMatch) {
        matchCount++;
        const notifRef = db.collection("notifications").doc();
        const matchNotif = {
          userId: buyerId,
          type: "whatsapp",
          email: buyer.email || "",
          status: "sent",
          sent: true,
          title: "🏡 AI Found a Match",
          message: `🏡 AI Found a Match

A property matching your saved search is now available.

Location: ${district}
Price: ₦${price.toLocaleString()}
Investment Score: ${property.investmentScore || "9.6/10"}

View Property
https://thelandlordproperty.com/dashboard`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const logRef = db.collection("activity_logs").doc();
        const activityLog = {
          userId: buyerId,
          action: "property_matched",
          details: `Matched with property "${title}" (ID: ${propertyId}) in ${district}.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(notifRef, matchNotif);
        batch.set(logRef, activityLog);
      }
    });

    if (matchCount > 0) {
      await batch.commit();

      // Send FCM pushes to all matched buyers
      for (const buyerDoc of buyersSnapshot.docs) {
        const buyer = buyerDoc.data();
        const prefs = buyer.preferences;
        if (!prefs) continue;
        const dMatch = prefs.preferredDistricts && prefs.preferredDistricts.includes(district);
        const bMatch = price <= (prefs.budget || Infinity);
        if (dMatch && bMatch) {
          await sendPush(buyerDoc.id, '🏡 AI Found a Match!', `A property in ${district} at ₦${price.toLocaleString()} matches your saved criteria.`);
        }
      }

      console.log(`[onPropertyCreated] Completed matching. Dispatched notifications to ${matchCount} matching buyers.`);
    } else {
      console.log("[onPropertyCreated] Completed matching. No matches found.");
    }
  });

/**
 * 4. onPropertyUpdated (Firestore Trigger - Deal Published Alert)
 * Triggers when an existing property is updated.
 * If status transitions to "Published", sends a WhatsApp alert and matches buyers.
 */
exports.onPropertyUpdated = functions.firestore
  .document("properties/{propertyId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const propertyId = context.params.propertyId;

    const wasPublished = beforeData.status === "Published";
    const isPublished = afterData.status === "Published";

    if (!wasPublished && isPublished) {
      const district = afterData.district || "Abuja";
      const price = afterData.askingPrice || afterData.nightlyRate || 0;
      const title = afterData.title || "New Property";

      console.log(`[onPropertyUpdated] Deal published! Sending alert for: "${title}" in ${district}`);

      const buyersSnapshot = await db
        .collection("users")
        .where("role", "==", "buyer")
        .get();

      if (buyersSnapshot.empty) {
        console.log("[onPropertyUpdated] No buyers registered.");
        return;
      }

      const batch = db.batch();
      let matchCount = 0;

      buyersSnapshot.forEach((buyerDoc) => {
        const buyer = buyerDoc.data();
        const buyerId = buyerDoc.id;
        const preferences = buyer.preferences;

        if (!preferences) return;

        const districtMatch = preferences.preferredDistricts && preferences.preferredDistricts.includes(district);
        const budgetMatch = price <= (preferences.budget || Infinity);

        if (districtMatch && budgetMatch) {
          matchCount++;
          const notifRef = db.collection("notifications").doc();
          const matchNotif = {
            userId: buyerId,
            type: "whatsapp",
            email: buyer.email || "",
            status: "sent",
            sent: true,
            title: "⚡ URGENT: Distress Deal Published",
            message: `⚡ URGENT: Distress Deal Published
            
A new verified distress property matching your preferences is now LIVE.

Property: ${title}
District: ${district}
Asking Price: ₦${price.toLocaleString()}

View Deal details:
https://thelandlordproperty.com/dashboard`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          };

          const logRef = db.collection("activity_logs").doc();
          const activityLog = {
            userId: buyerId,
            action: "property_matched",
            details: `Urgent Match: distress deal "${title}" (ID: ${propertyId}) is now published in ${district}.`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          };

          batch.set(notifRef, matchNotif);
          batch.set(logRef, activityLog);
        }
      });

      if (matchCount > 0) {
        await batch.commit();

        for (const buyerDoc of buyersSnapshot.docs) {
          const buyer = buyerDoc.data();
          const prefs = buyer.preferences;
          if (!prefs) continue;
          const dMatch = prefs.preferredDistricts && prefs.preferredDistricts.includes(district);
          const bMatch = price <= (prefs.budget || Infinity);
          if (dMatch && bMatch) {
            await sendPush(buyerDoc.id, '⚡ Distress Deal Published!', `New match in ${district}: ₦${price.toLocaleString()}`);
          }
        }
        console.log(`[onPropertyUpdated] Completed published matching. Notified ${matchCount} buyers.`);
      }
    }
  });


/**
 * 5. onOfferSubmitted (Firestore Trigger)
 * Triggers when a new offer document is written to the `offers` collection.
 * Sends a confirmation notification to the buyer and creates an admin alert.
 */
exports.onOfferSubmitted = functions.firestore
  .document("offers/{offerId}")
  .onCreate(async (snapshot, context) => {
    const offer = snapshot.data();
    const offerId = context.params.offerId;

    const buyerId = offer.userId;
    const buyerEmail = offer.userEmail || "";
    const buyerName = offer.userName || "Buyer";
    const dealName = offer.dealName || "Property";
    const district = offer.district || "Abuja";
    const offerPrice = offer.offerPrice || 0;
    const financing = offer.financing || "cash";
    const timeline = offer.timeline || 30;

    console.log(`[onOfferSubmitted] New offer from ${buyerName} for "${dealName}" — ₦${offerPrice.toLocaleString()}`);

    const batch = db.batch();

    // 1. Confirmation notification for the buyer
    const buyerNotifRef = db.collection("notifications").doc();
    batch.set(buyerNotifRef, {
      userId: buyerId,
      type: "whatsapp",
      email: buyerEmail,
      status: "sent",
      sent: true,
      title: "✅ Offer Received — The Landlord Property",
      message: `✅ Offer Received

Hello ${buyerName},

We have received your offer for:
📍 ${dealName}
📍 ${district}

Offer Price: ₦${offerPrice.toLocaleString()}
Financing: ${financing.charAt(0).toUpperCase() + financing.slice(1)}
Settlement: ${timeline} days

Our negotiation team will review and respond within 2 hours.

The Landlord Property AI`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Admin alert — write to a dedicated admin_notifications collection
    const adminNotifRef = db.collection("admin_notifications").doc();
    batch.set(adminNotifRef, {
      type: "offer_received",
      title: `New Offer: ₦${offerPrice.toLocaleString()} on ${dealName}`,
      buyerId,
      buyerName,
      buyerEmail,
      dealName,
      district,
      offerPrice,
      financing,
      timeline,
      offerId,
      status: "pending_review",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Activity log
    const logRef = db.collection("activity_logs").doc();
    batch.set(logRef, {
      userId: buyerId,
      action: "offer_submitted",
      details: `Offer of ₦${offerPrice.toLocaleString()} submitted for "${dealName}" (${district}). Financing: ${financing}. Settlement: ${timeline} days.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // 4. FCM push confirmation to buyer
    await sendPush(
      buyerId,
      "✅ Offer Received!",
      `Your offer of ₦${offerPrice.toLocaleString()} on ${dealName} is being reviewed. Expect a response within 2 hours.`
    );

    console.log(`[onOfferSubmitted] Offer ${offerId} processed. Sent confirmation to buyer ${buyerId}.`);
  });

const { getShortletPricing } = require("./shortletPricing");
const { getDistressDealIntelligence } = require("./distressDeal");

exports.getShortletPricing = getShortletPricing;
exports.getDistressDealIntelligence = getDistressDealIntelligence;
