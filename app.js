//datalayer-----------------------
const Sequelize = require('sequelize');
const db = new Sequelize('postgres://localhost/bookmarks_plus');

const syncAndSeed = async () => {
  try {
    await db.sync({ force: true });

    const shopping = await Category.create({ name: 'shopping' });
    const work = await Category.create({ name: 'work' });
    const doomscrolling = await Category.create({ name: 'doomscrolling' });
    //child tables need variables
    await Bookmark.create({ name: 'NewEgg.com', categoryId: shopping.id });
    await Bookmark.create({ name: 'system76.com', categoryId: shopping.id });
    await Bookmark.create({ name: 'fsf.org', categoryId: work.id });
    await Bookmark.create({ name: 'mozilla.org', categoryId: work.id });
    await Bookmark.create({
      name: 'twitter.com',
      categoryId: doomscrolling.id,
    });
    await Bookmark.create({
      name: 'reddit.com',
      categoryId: doomscrolling.id,
    });
  } catch (error) {
    console.log(error);
  }
};

//define parent model first
const Bookmark = db.define('bookmark', {
  name: { type: Sequelize.STRING, unique: true },
});
const Category = db.define('category', {
  name: Sequelize.STRING,
});

Bookmark.belongsTo(Category);
Category.hasMany(Bookmark);

//server stuff ----------------------
const express = require('express');
const app = express();
const methodOverride = require('method-override');

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

app.get('/', (req, res) => {
  res.redirect('/bookmarks');
});

const init = async () => {
  try {
    await syncAndSeed();
    console.log('~~~~~synced~~~~~');
    const port = process.env.PORT || 1337;
    app.listen(port, () => {
      console.log(`glistening on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
};

init();

//routes-----------------------
app.get('/bookmarks', async (req, res, next) => {
  try {
    const bookmarkList = await Bookmark.findAll({
      //include = join
      include: [Category],
    });
    const html = await `
    <html>
    <h1>Bookmarks</h1>
    <a href="/">back</a>
      <body>
        <ul>
          ${bookmarkList
            .map((x) => {
              return `<li>
              ${x.name}, <a href="/bookmarks/categories/${x.category.id}">${x.category.name}</a>
            </li>`;
            })
            .join('')}
        </ul>
        <form method="post" action="/bookmarks/?_method=put">
            <input name="name" placeholder="link"/>
            <button>submit</button>
            <p>
            <label for="category">category</label>
            <select name="categoryId">
              <!--<option value="default">pick a category</option>-->
              <option value="1">shopping</option>
              <option value="2">work</option>
              <option value="3">doomscrolling</option>
            </select>
            </p>
        </form>
      </body>
    </html>
    `;
    await res.send(html);
  } catch (error) {
    next(error);
  }
});

app.get('/bookmarks/categories/:categoryId', async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.categoryId);
    const bookmarksByCat = await Bookmark.findAll({
      where: { categoryId: category.id },
    });
    const html = `
    <html>
      <h1>Category: ${category.name}</h1>
      <a href="/">back</a>
      <body>
        <ul>
          ${bookmarksByCat
            .map(
              (x) => `
          <li>${x.name}</li>
          <form method="post" action="/bookmarks/categories/${x.name}">
            <button>delete
            </button>
          </form>
          `
            )
            .join('')}
        </ul>
      </body>
    </html>
    `;
    res.send(html);
  } catch (error) {
    next(error);
  }
});

app.put('/bookmarks', async (req, res, next) => {
  try {
    const newBookmark = await Bookmark.create({
      name: req.body.name,
      categoryId: req.body.categoryId,
    });
    res.redirect(`/bookmarks/categories/${newBookmark.categoryId}`);
  } catch (error) {
    next(error);
  }
});

app.post('/bookmarks/categories/:trash', async (req, res, next) => {
  try {
    const trash = await Bookmark.findOne({ where: { name: req.params.trash } });
    await trash.destroy();
    res.redirect(`/bookmarks/categories/${trash.categoryId}`);
  } catch (error) {
    next(error);
  }
});
