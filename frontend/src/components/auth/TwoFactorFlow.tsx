/**
 * The admin's two-step login, in place of the sign-in form while a challenge
 * is pending (sign-in page and the add-to-cart sign-in popup).
 */
import { useAuth } from "../../context/AuthContext";
import TwoFactorSetup from "./TwoFactorSetup";
import TwoFactorStep from "./TwoFactorStep";

const TwoFactorFlow = ({ onSuccess }: { onSuccess: () => void }) => {
  const { twoFactorChallenge } = useAuth();
  if (!twoFactorChallenge) return null;
  return twoFactorChallenge.purpose === "setup" ? (
    <TwoFactorSetup key={twoFactorChallenge.challengeToken} onSuccess={onSuccess} />
  ) : (
    <TwoFactorStep key={twoFactorChallenge.challengeToken} onSuccess={onSuccess} />
  );
};

export default TwoFactorFlow;
