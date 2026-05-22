"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { auth } from "@/lib/firebase";
import { getInvitedCounselorData, completeProfileAction } from "@/actions/profileActions";

export function CompleteCounsellorProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState({ street: "", city: "", state: "", country: "" });
  const [occupation, setOccupation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    if (!emailFromQuery) return;

    const decoded = decodeURIComponent(emailFromQuery);
    setEmail(decoded);

    getInvitedCounselorData(decoded).then(data => {
      if (data?.fullName) setFullName(data.fullName);
    });
  }, [searchParams]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be signed in to complete your profile.");
      setIsSubmitting(false);
      return;
    }

    const result = await completeProfileAction({
      uid: user.uid,
      email,
      fullName,
      phoneNumber,
      address,
      occupation,
    });

    if (result.success) {
      toast.success("Your profile has been submitted for review.");
      router.push("/profile-complete");
    } else {
      toast.error(result.message || "Failed to update profile. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
        <CardDescription>Fill in your details to submit your counselor application.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input id="phoneNumber" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
          </div>
          <div>
            <Label>Address</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <Input name="street" placeholder="Street" value={address.street} onChange={handleAddressChange} required />
              <Input name="city" placeholder="City" value={address.city} onChange={handleAddressChange} required />
              <Input name="state" placeholder="State" value={address.state} onChange={handleAddressChange} required />
              <Input name="country" placeholder="Country" value={address.country} onChange={handleAddressChange} required />
            </div>
          </div>
          <div>
            <Label htmlFor="occupation">Occupation / Specialization</Label>
            <Input id="occupation" value={occupation} onChange={e => setOccupation(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
