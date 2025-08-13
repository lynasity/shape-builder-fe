import * as React from "react";
//@ts-ignore
import styles from "styles/components.css";
import BooleanOperations from "./BooleanOperations";

// Shape Maker App - Boolean Operations Only
export const App = () => {
  return (
    <div className={styles.scrollContainer}>
      <BooleanOperations />
    </div>
  );
};