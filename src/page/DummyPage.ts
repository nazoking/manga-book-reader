import { SpreadPages } from "./SpreadPages";

export class DummyPage implements SpreadPages {
  async hasNext() {
    return false;
  }
  async nextPage() {
    return this;
  }
  async prevPage() {
    return this;
  }
  async move() {
    return this;
  }
  pageNumber() {
    return -1;
  }
  async canMove() {
    return false;
  }
  async hasPrev() {
    return false;
  }
  image1() {
    return null;
  }
  image2() {
    return null;
  }
  async isSingleUnit() {
    return true;
  }
}
