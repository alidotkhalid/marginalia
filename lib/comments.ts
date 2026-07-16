// Shape of a comment as returned by the getComments server action. Kept in a
// plain module so both the server action and the client component can import it.
export type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: { username: string; display_name: string | null } | null;
  // Net vote score and the current user's vote (-1, 0, or 1).
  score: number;
  my_vote: number;
};
