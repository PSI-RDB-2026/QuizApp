import axios from "axios";

const apiUrl = "/api";

export const postRegister = async (userParams) => {
  const { username, email, password } = userParams;
  try {
    const response = await axios.post(`${apiUrl}/users/register`, {
      username,
      email,
      password,
    });
    // Vrátíme response data
    return response;
  } catch (error: any) {
    // Vrátíme chybu, pokud k ní dojde
    console.error("Error during register:", error);
    return error.response ? error.response.data : { message: "Unknown error" };
  }
};
export const getLogin = async (userParams) => {
  const { username, password } = userParams;
  try {
    const response = await axios.post(`${apiUrl}/users/login`, {
      username,
      password,
    });
    // Vrátíme response data
    return response;
  } catch (error) {
    // Vrátíme chybu, pokud k ní dojde
    console.error("Error during login:", error);
    return error.response ? error.response.data : { message: "Unknown error" };
  }
};
