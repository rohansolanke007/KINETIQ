
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Panel } from "@/components/physics/ui";

export function FeedbackSection() {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setStatus("Please select a star rating.");
      return;
    }

    if (message.trim().length < 5) {
      setStatus("Please enter at least 5 characters.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      const { error } = await supabase.from("feedback").insert({
        rating,
        category,
        message: message.trim(),
      });

      if (error) throw error;

      setStatus("Thank you! Your feedback has been submitted.");
      setRating(0);
      setCategory("Suggestion");
      setMessage("");
    } catch (error) {
      console.error("Feedback submission failed:", error);
      setStatus("Feedback could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="feedback-heading">
      <Panel
        title="SHARE YOUR FEEDBACK"
        subtitle="HELP US IMPROVE KINETIQ"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-3 block text-sm font-medium">
              How was your experience?
            </label>

            <div className="flex gap-3" role="group" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  aria-pressed={rating === star}
                  className={`text-3xl transition-colors ${
                    rating >= star
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary/70"
                  }`}
                >
                  ★
                </button>
              ))}

              <span className="self-center text-xs text-muted-foreground">
                {rating ? `${rating}/5` : "Select a rating"}
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="feedback-category"
              className="mb-2 block text-sm font-medium"
            >
              Feedback category
            </label>

            <select
              id="feedback-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="tech h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            >
              <option value="Suggestion">Suggestion</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="mb-2 block text-sm font-medium"
            >
              Your message
            </label>

            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell us what you liked or what we could improve..."
              minLength={5}
              maxLength={2000}
              required
              rows={6}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />

            <p className="mt-1 text-right text-xs text-muted-foreground">
              {message.length}/2000
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "SUBMITTING..." : "SUBMIT FEEDBACK"}
          </button>

          {status && (
            <p role="status" aria-live="polite" className="text-sm">
              {status}
            </p>
          )}
        </form>
      </Panel>
    </section>
  );
}

