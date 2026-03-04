import logoDark from "./logo-dark.svg";
import logoLight from "./logo-light.svg";
type Props = {
  text: string;
}

const Welcome = ({  text  }: Props) => {
  
  return (
    <h1>{text["message"]}</h1>
  );
}

export default Welcome;