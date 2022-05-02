import "isomorphic-fetch";
import connectDb from "../models/api/api";
import models from "../modelSchema";

describe("insert", () => {
  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    console.log("테스트 끝났시유");
  });

  it("should insert a doc into collection", async () => {
    const mockUser = {
      hospitalId: "vatech",
      id: "asdf",
      text: "idontknow0",
      text2: "idontd"
    };

    const insertedUser = await models.tested
      .get({
        hospitalId: "vatech",
        id: "asdf"
      })
      .then(res => JSON.parse(JSON.stringify(res)));

    expect(insertedUser).toEqual(mockUser);
  });

  test("the stop is Arkadian puisto", async () => {
    // The result we are expecting from the GraphQL API
    const arkP = {
      getHello: {
        createdAt: "2022-03-17T04:26:53.344Z",
        hospitalId: "vatech",
        id: "e2e8f332-3d5e-4e87-806e-f3259f63fb38",
        text: "aaaaa"
      }
    };

    // The URL of the GraphQL API server
    return (
      fetch("http://localhost:8000/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The query we are sending to the GraphQL API
        body: JSON.stringify({
          query: `query {
                getHello(hospitalId:"vatech",id: "e2e8f332-3d5e-4e87-806e-f3259f63fb38") {
                    hospitalId
                    id
                    text
                    createdAt
                }
            }`
        })
      })
        .then(async res => {
          const ret = await res.json();

          return ret;
        })
        // The test condition itself
        .then(res => expect(res.data).toStrictEqual(arkP))
    );
  });
});
