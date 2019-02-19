Easy API

This is a data abstraction layer with a simple interface for doing CRUD. Abstraction
is achieved through implementation-specific adapters (i.e. MongoDB, Sqlite, Postgres, etc.).

- models should be usable client or server side

Create Model

```
  class Artist extends Model {

  }
```

Use Model

```
  const artist = new Artist();
  artist.name = 'Yes';
  await artist.save();

  const artistId = artist.id; // id is filled in when saved

  const sameArtist = Artist.find(artistId);
  console.log(sameArtist.name); // "Yes"
```
