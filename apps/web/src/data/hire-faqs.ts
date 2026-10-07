import { HOURS_PER_DAY_CAP } from "./plant-services";

/**
 * Plant hire and site services questions, shown on the FAQ and on
 * /plant-hire/how-it-works. Answers must match the booking flow
 * (PLANT_HIRE_CATALOGUE.md) and the Plant Hire & Site Services Terms.
 */
export const HIRE_FAQS: { question: string; answer: string }[] = [
  {
    question: "Who actually does the work?",
    answer:
      "A vetted independent partner near your site, with its own machines, operators and crew. We arrange the job: we quote you, take your payment, send the job to partners, keep the record and only pay the partner once you've signed the work off.",
  },
  {
    question: "Why can't I see a price for plant hire yet?",
    answer:
      "We only publish hire rates once at least two partners in a province have given us written rates. Until then, every request gets a written quote based on a partner's written quote for your job.",
  },
  {
    question: "What does wet hire include?",
    answer: `The machine, an operator, fuel and the operator's PPE. A hire day is up to ${HOURS_PER_DAY_CAP} machine hours; extra hours and standing time are only charged if they're in your quote or agreed in writing first. Transport to site is included where your quote says so.`,
  },
  {
    question: "Do I need an account?",
    answer: "Yes — you accept the quote and follow the job in your account, so create one with the same email you used for your request. It's free.",
  },
  {
    question: "How do I pay?",
    answer:
      "By EFT, using the booking reference shown in your account once you accept the quote. The job is only sent to partners after your payment clears. More payment options will follow.",
  },
  {
    question: "What if no partner can take my job?",
    answer: "We'll offer you other dates, or refund what you paid for that booking in full.",
  },
  {
    question: "What is the arrival code?",
    answer:
      "A 6-digit code in your booking. When the crew arrives, show it to them; entering it starts the job and confirms they're on your site. Only open it once they're actually there — opening a new code cancels the old one.",
  },
  {
    question: "Why can't I get the partner's phone number?",
    answer:
      "Neither side sees the other's contact details, and numbers or emails typed into booking messages are removed automatically. Keeping everything in the booking means we have the full record if anything goes wrong, and your payment stays protected.",
  },
  {
    question: "What if the crew is late, the machine breaks down or the weather stops work?",
    answer:
      "Tell us in your booking messages straight away. We'll arrange a replacement machine, new dates or a refund for the time not worked — you're not charged for time lost because the partner's machine broke down.",
  },
  {
    question: "What if I'm not happy with the work?",
    answer:
      "Raise a dispute in your booking while the job is in progress or within 48 hours of signing off. The partner isn't paid while a dispute is open; we review the job cards and messages and decide whether the partner is paid or you're refunded in full or in part.",
  },
  {
    question: "Can I cancel?",
    answer:
      "You can decline a quote at no cost. After paying, you get a full refund if no partner has accepted yet. Once a partner has accepted, costs they've already incurred (such as transport) may be deducted — we'll tell you the amount first.",
  },
];
