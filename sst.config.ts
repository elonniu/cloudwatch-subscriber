import { SSTConfig } from "sst";
import { Subscriber } from "./stacks/Subscriber";

export default {
  config(_input) {
    return {
      name: "cloudwatch-subscriber",
      region: "us-west-2",
    };
  },
  stacks(app) {    app.stack(Subscriber)
},
} satisfies SSTConfig;
