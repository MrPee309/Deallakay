// Shared links for beta-testing CTAs (Footer download banner + the
// Announcement Bar). Single source of truth — update a link here once
// instead of in every place it's used.
//
// TODO: replace with the App/Play Store links once DealLakay Alert is
// published there — this Expo "artifacts" URL is tied to one specific EAS
// build and needs to be swapped for each new build in the meantime.
export const ANDROID_APK_URL = "https://expo.dev/artifacts/eas/ByYezKBe7ZGQTzxb9fHiU36HKqDgvzOuBq5VVBsTxDo.apk";

// Hosted directly in this site's own /public/downloads folder.
export const GUIDE_PDF_URL = "/downloads/deallakay-gid-fomasyon.pdf";

// Reuses the existing support contact already shown in the Footer — no new
// feedback system/backend created for this.
export const FEEDBACK_EMAIL = "support@deallakay.com";
export const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("Feedback — Tès Beta DealLakay")}`;
