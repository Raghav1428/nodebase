import { useQueryStates } from "nuqs";
import { credentialParams } from "../params";

export const useCredentialParams = () => {
    return useQueryStates(credentialParams);
}