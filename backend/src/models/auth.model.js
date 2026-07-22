import { createPublicSupabaseClient } from "../db.js";

export const registerUser = async ({ email, password, displayName, redirectTo }) => {
  const client = createPublicSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName }, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
  return data;
};

export const loginUser = async ({ email, password }) => {
  const client = createPublicSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const requestPasswordReset = async ({ email, redirectTo }) => {
  const client = createPublicSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
};
