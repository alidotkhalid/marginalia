import { redirect } from "next/navigation";

// Likes were removed in favor of bookmark counts. Anyone landing here (old
// links) is sent to their Saved reads.
export default function LikedPage() {
  redirect("/saved");
}
