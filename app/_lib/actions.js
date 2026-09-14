"use server";

import { differenceInDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "./auth";
import { createBooking, getCabinPrice } from "./data-service";

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function createBookingAction(formData) {
  const session = await auth();
  const startDate = formData.get("startDate");
  const endDate = formData.get("endDate");
  const cabinId = Number(formData.get("cabinId"));
  const numGuests = Number(formData.get("numGuests"));

  if (!session?.user?.guestId) redirect("/login");
  if (!startDate || !endDate || !cabinId || !numGuests)
    throw new Error("Please select dates and the number of guests.");

  const numNights = differenceInDays(new Date(endDate), new Date(startDate));
  if (numNights < 1) throw new Error("Please select a valid date range.");

  const cabin = await getCabinPrice(cabinId);
  if (!cabin) throw new Error("Cabin could not be found.");

  const cabinPrice = cabin.regularPrice - cabin.discount;

  await createBooking({
    startDate,
    endDate,
    numNights,
    numGuests,
    cabinId,
    guestId: session.user.guestId,
    cabinPrice,
    totalPrice: cabinPrice * numNights,
    status: "unconfirmed",
    observations: formData.get("observations") || "",
  });

  revalidatePath("/account/reservations");
  redirect("/account/reservations");
}
