{{ foo | escape }}
{{ arr | escape }}
{{ obj | escape }}
--
{{ foo | safe }}
{{ arr | safe }}
{{ obj | safe }}
--
{{ foo | safe | escape }}
{{ arr | safe | escape }}
{{ obj | safe | escape }}