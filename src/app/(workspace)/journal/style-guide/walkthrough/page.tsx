import { redirect } from "next/navigation";

// The voice profile walkthrough lives at this URL but the implementation
// arrives in #22. Until then we redirect back to the Style Guide so the
// entry point in the panel never lands the user on a 404.
export default function VoiceProfileWalkthroughPlaceholder() {
  redirect("/journal/style-guide");
}
