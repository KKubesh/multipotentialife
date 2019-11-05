import * as React from "react";
import Question from "./Question";
import Controls from "./Controls/Controls";

const MainContainer: React.FunctionComponent = () => {
  return (
    <div>
        This will be the MainContainer
      <Question />
      <Controls />
    </div>
  );
};

export default MainContainer;
