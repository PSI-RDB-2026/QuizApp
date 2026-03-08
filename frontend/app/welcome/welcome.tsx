import logoDark from "./logo-dark.svg";
import logoLight from "./logo-light.svg";
type Props = {
  text: { message: string };
}

const Welcome = ({ text }: Props) => {
  
  return (
    <h1>{text.message}</h1>
  );
}

export default Welcome;