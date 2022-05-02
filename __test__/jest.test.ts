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

    console.log("mockUser ::::::::::::::::::: ", mockUser);
    console.log("insertedusers ::::::::::::::::::: ", insertedUser);

    expect(insertedUser).toEqual(mockUser);
  });
});
